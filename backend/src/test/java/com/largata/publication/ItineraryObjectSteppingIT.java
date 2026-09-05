package com.largata.publication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class ItineraryObjectSteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID TRIP = UUID.randomUUID();

    @BeforeAll
    static void migrateToTheEveThenApply() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        DataSource dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("48")
                .cleanDisabled(false)
                .load()
                .migrate();

        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                OWNER,
                "uid-" + OWNER,
                OWNER + "@example.com",
                "Stepping Fixture");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("49")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void theTableArrivesAndTakesARow() {
        insertObject(UUID.randomUUID(), UUID.randomUUID());

        assertThat(
                        jdbc.queryForObject(
                                "SELECT retired FROM itinerary_object LIMIT 1", Boolean.class))
                .as("retired defaults false — a freshly minted object is live")
                .isFalse();
    }


    @Test
    void oneTripCanNeverMintTwoObjects() {
        insertObject(UUID.randomUUID(), TRIP);

        assertThatExceptionOfType(DuplicateKeyException.class)
                .as("identity survives publish cycles because UNIQUE(trip_id) makes a second mint impossible")
                .isThrownBy(() -> insertObject(UUID.randomUUID(), TRIP));
    }


    @Test
    void theTripReferenceCarriesNoForeignKey() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM information_schema.table_constraints"
                                        + " WHERE table_name = 'itinerary_object'"
                                        + " AND constraint_type = 'FOREIGN KEY'"
                                        + " AND constraint_name LIKE '%trip%'",
                                Integer.class))
                .as("a dangling trip_id after destruction is the design — no FK may exist to cascade it")
                .isZero();
    }


    private static void insertObject(UUID id, UUID tripId) {
        jdbc.update(
                "INSERT INTO itinerary_object"
                        + " (id, trip_id, owner_id, plan, published_at, created_at)"
                        + " VALUES (?, ?, ?, '{}', ?, ?)",
                id,
                tripId,
                OWNER,
                Timestamp.from(Instant.now()),
                Timestamp.from(Instant.now()));
    }
}
