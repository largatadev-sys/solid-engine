package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

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


class ItineraryLifecycleRenameIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;
    private static DataSource dataSource;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID A_TRIP_BEING_LIVED = UUID.randomUUID();

    private static final UUID A_TRIP_STILL_PLANNED = UUID.randomUUID();

    private static final UUID A_TRIP_THAT_HAPPENED = UUID.randomUUID();

    private static final Instant CREATED_AT = Instant.parse("2026-05-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfTheRenameThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("20").migrate();

        seedLegacyTrip(A_TRIP_BEING_LIVED, "Iceland Ring Road", "ACTIVE");
        seedLegacyTrip(A_TRIP_STILL_PLANNED, "Nippon 2027", "DRAFT");
        seedLegacyTrip(A_TRIP_THAT_HAPPENED, "Palawan with the fam", "COMPLETED");

        assertThat(statesPresent())
                .as("the fixture is genuinely pre-V21 — it holds the word this migration retires")
                .contains("ACTIVE");

        flywayTo("21").migrate();
    }


    @Test
    void theTripBeingLivedIsRenamedRatherThanReclassified() {
        assertThat(stateOf(A_TRIP_BEING_LIVED))
                .as("ACTIVE meant the trip is being lived — that fact is now spelled ONGOING")
                .isEqualTo("ONGOING");
    }


    @Test
    void theOtherTwoRungsKeepTheValuesTheyAlreadyHeld() {
        assertThat(stateOf(A_TRIP_STILL_PLANNED)).isEqualTo("DRAFT");
        assertThat(stateOf(A_TRIP_THAT_HAPPENED)).isEqualTo("COMPLETED");
    }


    @Test
    void noRowStillReadsACTIVE_becauseNothingCanParseItAfterThisMigration() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE state = 'ACTIVE'", Integer.class))
                .isZero();
    }


    @Test
    void noRowIsBackfilledIntoTheNewRung_becauseNoTripHasEverFinishedPlanning() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE state = 'UPCOMING'", Integer.class))
                .as("`upcoming` arrives on a traveler's tap; asserting it retroactively would invent a fact")
                .isZero();
    }


    @Test
    void everyRowReadsAValueThisMigrationLeavesLegal() {
        List<String> states = jdbc.queryForList("SELECT state FROM itinerary", String.class);

        assertThat(states).isNotEmpty().doesNotContainNull();
        assertThat(states)
                .as("the ladder V21 leaves behind — DRAFT is legal here and dies later, at V36")
                .isSubsetOf("DRAFT", "UPCOMING", "ONGOING", "COMPLETED");
        assertThat(states)
                .as("@Enumerated(STRING) writes the NAME — a lower-case spelling here is the V3 trap")
                .allSatisfy(state -> assertThat(state).isUpperCase());
    }


    @Test
    void theOtherTwoAxesAreUntouched_thisMigrationMovesOneValueOnOneAxis() {
        assertThat(jdbc.queryForList("SELECT published FROM itinerary", Boolean.class)).doesNotContainNull();
        assertThat(jdbc.queryForList("SELECT DISTINCT visibility FROM itinerary", String.class))
                .containsExactly("PUBLIC");
    }


    @Test
    void theWorkspaceKeepsItsOwnACTIVE_theTwoWordsWereNeverTheSameFact() {
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_name = 'workspace' AND column_name = 'state'",
                        Integer.class))
                .as("workspace.state means not-archived and is a different axis entirely")
                .isEqualTo(1);
    }


    @Test
    void theGuardRefusesAValueTheRenameCouldNotClassify() {
        PostgreSQLContainer other = new PostgreSQLContainer("postgres:18-alpine");
        other.start();
        try {
            DriverManagerDataSource source = new DriverManagerDataSource();
            source.setUrl(other.getJdbcUrl());
            source.setUsername(other.getUsername());
            source.setPassword(other.getPassword());
            JdbcTemplate otherJdbc = new JdbcTemplate(source);

            Flyway.configure().dataSource(source).target("20").load().migrate();
            otherJdbc.update(
                    "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, state, visibility,"
                            + " published, created_at) VALUES (?, ?, ?, ?, '{}', 'PUBLISHED', 'PUBLIC', false, ?)",
                    UUID.randomUUID(),
                    ANA,
                    "A value from a model that never shipped",
                    new String[] {"nowhere"},
                    Timestamp.from(CREATED_AT));

            assertThat(catchThrowable(() -> Flyway.configure().dataSource(source).target("21").load().migrate()))
                    .as("an unclassifiable value would survive the UPDATE and fail later, at read time")
                    .isNotNull()
                    .hasMessageContaining("DRAFT, ACTIVE or COMPLETED");
        } finally {
            other.stop();
        }
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure().dataSource(dataSource).target(version).load();
    }

    private static void seedLegacyTrip(UUID id, String title, String state) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, state, visibility, published,"
                        + " created_at) VALUES (?, ?, ?, ?, '{}', ?, 'PUBLIC', false, ?)",
                id,
                ANA,
                title,
                new String[] {"nowhere"},
                state,
                Timestamp.from(CREATED_AT));
    }

    private static List<String> statesPresent() {
        return jdbc.queryForList("SELECT DISTINCT state FROM itinerary", String.class);
    }

    private static String stateOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }
}
