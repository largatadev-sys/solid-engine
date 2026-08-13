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


class ItineraryPublishedAtBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID PUBLISHED_AND_COMPLETED = UUID.randomUUID();
    private static final UUID PUBLISHED_WITHOUT_COMPLETION = UUID.randomUUID();
    private static final UUID NEVER_PUBLISHED = UUID.randomUUID();
    private static final UUID PUBLISHED_BUT_PRIVATE = UUID.randomUUID();

    private static final Instant COMPLETED_AT =
            Instant.parse("2026-04-17T11:02:03Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant PRIVATE_COMPLETED_AT =
            Instant.parse("2026-01-05T08:30:00Z").truncatedTo(ChronoUnit.MICROS);

    private static Instant migratedAround;


    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("30").migrate();

        seedLegacy(PUBLISHED_AND_COMPLETED, "Osaka in spring", true, COMPLETED_AT, "PUBLIC");
        seedLegacy(PUBLISHED_WITHOUT_COMPLETION, "Hokkaido", true, null, "PUBLIC");
        seedLegacy(NEVER_PUBLISHED, "Palawan someday", false, null, "PUBLIC");
        seedLegacy(PUBLISHED_BUT_PRIVATE, "Boracay quietly", true, PRIVATE_COMPLETED_AT, "PRIVATE");

        assertThat(columnExists())
                .as("the fixture is the legacy shape — published_at does not exist yet")
                .isFalse();

        migratedAround = Instant.now().truncatedTo(ChronoUnit.MICROS);
        flywayTo("31").migrate();
    }


    @Test
    void aPublishedTripInheritsTheStampFromItsCompletion() {
        assertThat(publishedAtOf(PUBLISHED_AND_COMPLETED))
                .as("completed_at is the closest true answer to when a stranger could first have seen it")
                .isEqualTo(COMPLETED_AT);
    }


    @Test
    void aPublishedTripWithNoCompletionFallsBackToTheMigrationClock() {
        Instant stamped = publishedAtOf(PUBLISHED_WITHOUT_COMPLETION);

        assertThat(stamped).as("the fallback fires rather than leaving a published row null").isNotNull();
        assertThat(stamped)
                .as("now(), not the epoch and not some other row's stamp")
                .isAfterOrEqualTo(migratedAround.minusSeconds(60));
        assertThat(stamped).isBefore(migratedAround.plusSeconds(600));
    }


    @Test
    void aNeverPublishedTripKeepsANullStamp() {
        assertThat(publishedAtOf(NEVER_PUBLISHED))
                .as("null means never been public — a real category, not missing data")
                .isNull();
    }


    @Test
    void aPublishedButPrivateTripIsStillStamped() {
        assertThat(publishedAtOf(PUBLISHED_BUT_PRIVATE))
                .as("the column records publication, not audience — visibility filters at read time")
                .isEqualTo(PRIVATE_COMPLETED_AT);
    }


    @Test
    void exactlyTheThreePublishedRowsAreStamped() {
        assertThat(count("SELECT count(*) FROM itinerary WHERE published_at IS NOT NULL"))
                .as("no unpublished row was swept up by the backfill")
                .isEqualTo(3);
        assertThat(count("SELECT count(*) FROM itinerary WHERE published = true AND published_at IS NULL"))
                .as("no published row was left behind")
                .isZero();
    }


    @Test
    void theDiscoveryIndexExistsSoTheBrowseOrderIsNotASequentialScan() {
        assertThat(count("SELECT count(*) FROM pg_indexes WHERE indexname = 'idx_itinerary_discovery'"))
                .isEqualTo(1);
    }


    private static boolean columnExists() {
        return count(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_name = 'itinerary' AND column_name = 'published_at'")
                > 0;
    }


    private static Instant publishedAtOf(UUID itineraryId) {
        Timestamp stamped =
                jdbc.queryForObject(
                        "SELECT published_at FROM itinerary WHERE id = ?", Timestamp.class, itineraryId);
        return stamped == null ? null : stamped.toInstant();
    }


    private static void seedLegacy(
            UUID id, String title, boolean published, Instant completedAt, String visibility) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, state, visibility, "
                        + "published, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                ANA,
                title,
                new String[] {"somewhere"},
                new String[] {},
                completedAt == null ? "DRAFT" : "COMPLETED",
                visibility,
                published,
                Timestamp.from(Instant.parse("2026-01-01T00:00:00Z")),
                completedAt == null ? null : Timestamp.from(completedAt));
    }


    private static int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }
}
