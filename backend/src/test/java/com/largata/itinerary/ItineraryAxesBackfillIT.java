package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class ItineraryAxesBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;
    private static DataSource dataSource;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID A_PUBLISHED_TRIP = UUID.randomUUID();

    private static final UUID AN_UNPUBLISHED_TRIP = UUID.randomUUID();

    private static final Instant CREATED_AT = Instant.parse("2026-05-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("19").migrate();

        seedLegacyTrip(A_PUBLISHED_TRIP, "Island Hopping", "PUBLISHED");
        seedLegacyTrip(AN_UNPUBLISHED_TRIP, "Someday, Japan", "PRIVATE");

        assertThat(columnExists("published")).as("the fixture is genuinely pre-V20").isFalse();
        assertThat(columnExists("visibility")).as("…and carries the column V20 narrows").isTrue();

        flywayTo("20").migrate();
    }


    @Test
    void aPublishedItineraryKeepsItsReachAndGainsTheFeedFact() {
        assertThat(publishedOf(A_PUBLISHED_TRIP)).isTrue();
        assertThat(visibilityOf(A_PUBLISHED_TRIP))
                .as("PUBLISHED meant every authenticated traveler could read it — that is PUBLIC as an audience")
                .isEqualTo("PUBLIC");
    }


    @Test
    void anUnpublishedItineraryLeavesTheFeedFactFalseAndDefaultsItsAudienceToPublic() {
        assertThat(publishedOf(AN_UNPUBLISHED_TRIP))
                .as("old `private` meant NOT PUBLISHED — that is the feed fact, not the audience")
                .isFalse();
        assertThat(visibilityOf(AN_UNPUBLISHED_TRIP))
                .as("an unpublished trip has no restricted audience to preserve, so it defaults to public")
                .isEqualTo("PUBLIC");
    }


    @Test
    void theOldColumnSurvives_becauseThisMigrationNarrowsItRatherThanReplacingIt() {
        assertThat(columnExists("visibility")).isTrue();
        assertThat(columnExists("published")).isTrue();
        assertThat(columnExists("status"))
                .as("ADR-018's intermediate column is never created — V20 goes straight to three axes")
                .isFalse();
    }


    @Test
    void theLifecycleColumnIsUntouched_itIsTheThirdAxisAndAlreadyHeldItsValue() {
        assertThat(stateOf(A_PUBLISHED_TRIP)).isEqualTo("DRAFT");
        assertThat(stateOf(AN_UNPUBLISHED_TRIP)).isEqualTo("DRAFT");
    }


    @Test
    void noRowStillReadsPUBLISHED_becauseThatWasNeverAnAudience() {
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM itinerary WHERE visibility = 'PUBLISHED'", Integer.class))
                .isZero();
    }


    @Test
    void everyRowHasBothFactsAndTheSpellingIsTheEnumName() {
        List<String> visibilities = jdbc.queryForList("SELECT visibility FROM itinerary", String.class);

        assertThat(visibilities).isNotEmpty().doesNotContainNull();
        assertThat(visibilities)
                .as("@Enumerated(STRING) writes the NAME — a lower-case spelling here is the V3 trap")
                .allSatisfy(visibility -> assertThat(visibility).isUpperCase());
        assertThat(jdbc.queryForList("SELECT published FROM itinerary", Boolean.class)).doesNotContainNull();
    }


    @Test
    void theGuardRefusesAValueTheRemapCouldNotClassify() {
        PostgreSQLContainer other = new PostgreSQLContainer("postgres:18-alpine");
        other.start();
        try {
            DriverManagerDataSource source = new DriverManagerDataSource();
            source.setUrl(other.getJdbcUrl());
            source.setUsername(other.getUsername());
            source.setPassword(other.getPassword());
            JdbcTemplate otherJdbc = new JdbcTemplate(source);

            Flyway.configure().dataSource(source).target("19").load().migrate();
            otherJdbc.update(
                    "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, state, visibility,"
                            + " created_at) VALUES (?, ?, ?, ?, '{}', 'DRAFT', 'UNLISTED', ?)",
                    UUID.randomUUID(),
                    ANA,
                    "A value from a model that never shipped",
                    new String[] {"nowhere"},
                    Timestamp.from(CREATED_AT));

            assertThat(
                            org.assertj.core.api.Assertions.catchThrowable(
                                    () -> Flyway.configure().dataSource(source).target("20").load().migrate()))
                    .as("a third value would pass through both UPDATEs and land as an audience nobody chose")
                    .isNotNull()
                    .hasMessageContaining("PRIVATE or PUBLISHED");
        } finally {
            other.stop();
        }
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure().dataSource(dataSource).target(version).load();
    }

    private static void seedLegacyTrip(UUID id, String title, String visibility) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, state, visibility, created_at) "
                        + "VALUES (?, ?, ?, ?, '{}', 'DRAFT', ?, ?)",
                id,
                ANA,
                title,
                new String[] {"nowhere"},
                visibility,
                Timestamp.from(CREATED_AT));
    }

    private static Boolean publishedOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT published FROM itinerary WHERE id = ?", Boolean.class, itineraryId);
    }

    private static String visibilityOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT visibility FROM itinerary WHERE id = ?", String.class, itineraryId);
    }

    private static String stateOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }

    private static boolean columnExists(String column) {
        Integer found =
                jdbc.queryForObject(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_name = 'itinerary' AND column_name = ?",
                        Integer.class,
                        column);
        return found != null && found > 0;
    }
}
