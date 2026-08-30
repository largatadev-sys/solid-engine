package com.largata.diary;

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


class DiarySteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID AUTHOR = UUID.randomUUID();
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
                .target("44")
                .cleanDisabled(false)
                .load()
                .migrate();

        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                AUTHOR,
                "uid-" + AUTHOR,
                AUTHOR + "@example.com",
                "Stepping Fixture");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("45")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void oneTravelerMintsAtMostOneDiaryPerTrip() {
        insertDiary(UUID.randomUUID(), TRIP);

        assertThatExceptionOfType(DuplicateKeyException.class)
                .as("a double-post race cannot mint two trip diaries — the partial index refuses")
                .isThrownBy(() -> insertDiary(UUID.randomUUID(), TRIP));
    }


    @Test
    void standaloneDiariesAreUnlimited() {
        insertDiary(UUID.randomUUID(), null);
        insertDiary(UUID.randomUUID(), null);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary WHERE trip_id IS NULL", Integer.class))
                .as("the unique index's predicate excludes NULL — no-trip diaries never collide")
                .isEqualTo(2);
    }


    @Test
    void theTripReferenceCarriesNoForeignKey() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM information_schema.table_constraints"
                                        + " WHERE table_name = 'diary'"
                                        + " AND constraint_type = 'FOREIGN KEY'"
                                        + " AND constraint_name LIKE '%trip%'",
                                Integer.class))
                .as("a member's diary survives the trip's destruction — nothing may cascade here")
                .isZero();
    }


    private static void insertDiary(UUID id, UUID tripId) {
        jdbc.update(
                "INSERT INTO diary (id, author_id, trip_id, title, created_at, updated_at)"
                        + " VALUES (?, ?, ?, 'Stepping diary', ?, ?)",
                id,
                AUTHOR,
                tripId,
                Timestamp.from(Instant.now()),
                Timestamp.from(Instant.now()));
    }
}
