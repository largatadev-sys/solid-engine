package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class DiaryPublicBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID TRIP = UUID.randomUUID();

    private static final UUID NEVER_SHARED = UUID.randomUUID();
    private static final UUID SHARED_LONG_AGO = UUID.randomUUID();
    private static final UUID ALSO_NEVER_SHARED = UUID.randomUUID();

    private static final Instant WRITTEN_AT = Instant.parse("2026-04-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);
    private static final Instant WRITTEN_LATER = Instant.parse("2026-05-19T08:30:00Z").truncatedTo(ChronoUnit.MICROS);
    private static final Instant SHARED_AT = Instant.parse("2026-06-01T09:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("29").migrate();

        seedTraveler();
        seedTrip();
        seedEntry(NEVER_SHARED, "Sunrise gate", WRITTEN_AT, null);
        seedEntry(ALSO_NEVER_SHARED, "Rice terraces", WRITTEN_LATER, null);
        seedEntry(SHARED_LONG_AGO, "Already public", WRITTEN_AT, SHARED_AT);

        assertThat(count("SELECT count(*) FROM diary_entry WHERE shared_at IS NULL"))
                .as("the fixture is genuinely pre-V30 — two entries the old model kept private")
                .isEqualTo(2);

        flywayTo("30").migrate();
    }


    @Test
    void anEntryTheOldModelKeptPrivateIsNowPublic() {
        assertThat(sharedAtOf(NEVER_SHARED)).isNotNull();
        assertThat(sharedAtOf(ALSO_NEVER_SHARED)).isNotNull();
    }


    @Test
    void noDiaryEntryIsLeftPrivate() {
        assertThat(count("SELECT count(*) FROM diary_entry WHERE shared_at IS NULL"))
                .as("nothing may stay invisible in a product with no UI left to surface it")
                .isZero();
    }


    @Test
    void itBecamePublicWhenItWasWrittenRatherThanWhenTheMigrationRan() {
        assertThat(sharedAtOf(NEVER_SHARED)).isEqualTo(WRITTEN_AT);
        assertThat(sharedAtOf(ALSO_NEVER_SHARED)).isEqualTo(WRITTEN_LATER);
    }


    @Test
    void soTheBackfilledEntriesKeepTheirOwnOrderRatherThanTyingAtTheTopOfTheFeed() {
        assertThat(jdbc.queryForList(
                        "SELECT activity_title FROM diary_entry ORDER BY shared_at DESC, id DESC", String.class))
                .as("all three carry distinct instants, so the feed's cursor still pages")
                .containsExactly("Already public", "Rice terraces", "Sunrise gate");
    }


    @Test
    void anEntryThatWasAlreadySharedKeepsTheInstantItWasSharedAt() {
        assertThat(sharedAtOf(SHARED_LONG_AGO))
                .as("the backfill touches only NULLs — a real share is not restamped")
                .isEqualTo(SHARED_AT);
    }


    @Test
    void theColumnStaysNullableSoTheParkedMechanismCanReturnThroughIt() {
        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT is_nullable FROM information_schema.columns
                                 WHERE table_name = 'diary_entry' AND column_name = 'shared_at'
                                """,
                                String.class))
                .isEqualTo("YES");
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }


    private static void seedTraveler() {
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
                ANA,
                "uid-" + ANA,
                "ana@example.test",
                "Ana",
                Timestamp.from(WRITTEN_AT));
    }


    private static void seedTrip() {
        jdbc.update(
                "INSERT INTO itinerary "
                        + "(id, owner_id, title, destinations, standouts, state, visibility, published, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, 'COMPLETED', 'PRIVATE', false, ?)",
                TRIP,
                ANA,
                "Bali Temple Run",
                new String[] {"Bali"},
                new String[] {},
                Timestamp.from(WRITTEN_AT));
    }


    private static void seedEntry(UUID id, String activityTitle, Instant createdAt, Instant sharedAt) {
        jdbc.update(
                "INSERT INTO diary_entry (id, traveler_id, itinerary_id, activity_title, day_label, "
                        + "created_at, updated_at, shared_at) VALUES (?, ?, ?, ?, 'Day 1', ?, ?, ?)",
                id,
                ANA,
                TRIP,
                activityTitle,
                Timestamp.from(createdAt),
                Timestamp.from(createdAt),
                sharedAt == null ? null : Timestamp.from(sharedAt));
    }


    private static Instant sharedAtOf(UUID entryId) {
        Timestamp at =
                jdbc.queryForObject(
                        "SELECT shared_at FROM diary_entry WHERE id = ?", Timestamp.class, entryId);
        return at == null ? null : at.toInstant();
    }


    private static long count(String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }
}
