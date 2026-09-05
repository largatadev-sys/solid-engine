package com.largata.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class DiaryEntryUnchainedSteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID TRAVELER = UUID.randomUUID();
    private static final UUID TRIP = UUID.randomUUID();
    private static final UUID DAY = UUID.randomUUID();
    private static final UUID ACTIVITY = UUID.randomUUID();
    private static final UUID ENTRY = UUID.randomUUID();

    @BeforeAll
    static void migrateToTheEveSeedTheLegacyShapeThenApply() {
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
                .target("51")
                .cleanDisabled(false)
                .load()
                .migrate();

        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                TRAVELER,
                "uid-" + TRAVELER,
                TRAVELER + "@example.com",
                "Stepping Fixture");
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state,"
                        + " published, created_at)"
                        + " VALUES (?, ?, 'Doomed trip', 'nowhere', '{}', 'ONGOING', false, ?)",
                TRIP,
                TRAVELER,
                Timestamp.from(Instant.now()));
        jdbc.update(
                "INSERT INTO day (id, itinerary_id, ordinal, created_at) VALUES (?, ?, 1, now())",
                DAY,
                TRIP);
        jdbc.update(
                "INSERT INTO activity (id, day_id, sort_order, title, last_edited_by,"
                        + " last_edited_at, created_at) VALUES (?, ?, 1, 'Doomed act', ?, now(), now())",
                ACTIVITY,
                DAY,
                TRAVELER);
        jdbc.update(
                "INSERT INTO diary_entry (id, traveler_id, itinerary_id, activity_id,"
                        + " activity_title, day_label, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, 'Doomed act', 'Day 1', now(), now())",
                ENTRY,
                TRAVELER,
                TRIP,
                ACTIVITY);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("52")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void destructionCanNoLongerReachTheEntryAndItsProvenanceMerelyDangles() {
        jdbc.update("DELETE FROM activity WHERE id = ?", ACTIVITY);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT activity_id FROM diary_entry WHERE id = ?", UUID.class, ENTRY))
                .as("SET NULL is gone — deleting the plan activity leaves the pointer dangling")
                .isEqualTo(ACTIVITY);

        jdbc.update("DELETE FROM itinerary WHERE id = ?", TRIP);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary_entry WHERE itinerary_id = ?",
                                Integer.class,
                                TRIP))
                .as("the cascade is gone — destroying the trip leaves the entry standing")
                .isEqualTo(1);
    }


    @Test
    void onlyTheTravelerChainRemainsOnTheOldEntriesTable() {
        assertThat(
                        jdbc.queryForList(
                                "SELECT constraint_name FROM information_schema.table_constraints"
                                        + " WHERE table_name = 'diary_entry'"
                                        + " AND constraint_type = 'FOREIGN KEY'",
                                String.class))
                .as("both plan-world chains dropped; the traveler FK stays — authors are keepers")
                .containsExactly("diary_entry_traveler_id_fkey");
    }
}
