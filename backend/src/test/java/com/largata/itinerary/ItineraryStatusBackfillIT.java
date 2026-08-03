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


class ItineraryStatusBackfillIT {

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

        assertThat(columnExists("status")).as("the fixture is genuinely pre-V20").isFalse();
        assertThat(columnExists("visibility")).as("…and still carries the old column").isTrue();

        flywayTo("20").migrate();
    }


    @Test
    void aPublishedItineraryBecomesPUBLIC_becauseEveryAuthenticatedTravelerCouldAlreadyReadIt() {
        assertThat(statusOf(A_PUBLISHED_TRIP)).isEqualTo("PUBLIC");
    }


    @Test
    void anUnpublishedItineraryBecomesDRAFT_becauseOldPrivateMeantNotPublished() {
        assertThat(statusOf(AN_UNPUBLISHED_TRIP))
                .as("old `private` meant not-published, which is what draft means now — NOT the new `private`")
                .isEqualTo("DRAFT");
    }


    @Test
    void nothingLandsInTheNewPrivate_becauseTheNarrowerAudienceCouldNotBeChosenBefore() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE status = 'PRIVATE'", Integer.class))
                .isZero();
    }


    @Test
    void theOldColumnIsGone_theFactItCarriedNowLivesInStatusAlone() {
        assertThat(columnExists("visibility")).isFalse();
        assertThat(columnExists("status")).isTrue();
    }


    @Test
    void everyRowHasAStatusAndTheSpellingIsTheEnumName() {
        List<String> statuses = jdbc.queryForList("SELECT status FROM itinerary", String.class);

        assertThat(statuses).isNotEmpty().doesNotContainNull();
        assertThat(statuses)
                .as("@Enumerated(STRING) writes the NAME — a lower-case spelling here is the V3 trap")
                .allSatisfy(status -> assertThat(status).isUpperCase());
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

    private static String statusOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT status FROM itinerary WHERE id = ?", String.class, itineraryId);
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
