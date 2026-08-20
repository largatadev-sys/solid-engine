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


class ItineraryThreeStateRemapIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;
    private static DataSource dataSource;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID A_DRAFT_TRIP = UUID.randomUUID();

    private static final UUID A_SECOND_DRAFT_TRIP = UUID.randomUUID();

    private static final UUID AN_UPCOMING_TRIP = UUID.randomUUID();

    private static final UUID AN_ONGOING_TRIP = UUID.randomUUID();

    private static final UUID A_COMPLETED_TRIP = UUID.randomUUID();

    private static final Instant CREATED_AT =
            Instant.parse("2026-06-11T08:00:00Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant STARTED_AT =
            Instant.parse("2026-06-20T08:00:00Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant COMPLETED_AT =
            Instant.parse("2026-06-28T08:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfTheRemapThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("35").migrate();

        seedLegacyTrip(A_DRAFT_TRIP, "Someday, Hokkaido", "DRAFT", null, null);
        seedLegacyTrip(A_SECOND_DRAFT_TRIP, "Notes for Lisbon", "DRAFT", null, null);
        seedLegacyTrip(AN_UPCOMING_TRIP, "Kyoto in Spring", "UPCOMING", null, null);
        seedLegacyTrip(AN_ONGOING_TRIP, "Island Hopping", "ONGOING", STARTED_AT, null);
        seedLegacyTrip(A_COMPLETED_TRIP, "Lisbon & the Algarve", "COMPLETED", STARTED_AT, COMPLETED_AT);

        assertThat(draftRowCount()).as("the fixture is genuinely pre-V36").isEqualTo(2);

        flywayTo("36").migrate();
    }


    @Test
    void everyDraftRowBecomesUpcoming() {
        assertThat(stateOf(A_DRAFT_TRIP)).isEqualTo("UPCOMING");
        assertThat(stateOf(A_SECOND_DRAFT_TRIP))
                .as("the remap is an UPDATE over the whole table, not a one-row fix")
                .isEqualTo("UPCOMING");
    }


    @Test
    void noRowStillReadsDRAFT_becauseTheEnumCanNoLongerParseIt() {
        assertThat(draftRowCount()).isZero();
    }


    @Test
    void theSpellingIsTheEnumNameNotTheWireForm() {
        List<String> states = jdbc.queryForList("SELECT state FROM itinerary", String.class);

        assertThat(states).isNotEmpty().doesNotContainNull();
        assertThat(states)
                .as("@Enumerated(STRING) writes the NAME — a lower-case spelling here is the V3 trap")
                .allSatisfy(state -> assertThat(state).isUpperCase());
        assertThat(states).containsOnly("UPCOMING", "ONGOING", "COMPLETED");
    }


    @Test
    void theOtherThreeStatesAreLeftExactlyWhereTheyWere() {
        assertThat(stateOf(AN_UPCOMING_TRIP)).isEqualTo("UPCOMING");
        assertThat(stateOf(AN_ONGOING_TRIP)).isEqualTo("ONGOING");
        assertThat(stateOf(A_COMPLETED_TRIP)).isEqualTo("COMPLETED");
    }


    @Test
    void aRemappedDraftCarriesNoTravelStamps_soItIsIndistinguishableFromATripCreatedToday() {
        assertThat(startedAtOf(A_DRAFT_TRIP))
                .as("a draft never set off, so there is no stamp to clear and none to invent")
                .isNull();
        assertThat(completedAtOf(A_DRAFT_TRIP)).isNull();
    }


    @Test
    void theStampsOfEveryOtherRowSurvive() {
        assertThat(startedAtOf(AN_ONGOING_TRIP)).isEqualTo(Timestamp.from(STARTED_AT));
        assertThat(startedAtOf(A_COMPLETED_TRIP)).isEqualTo(Timestamp.from(STARTED_AT));
        assertThat(completedAtOf(A_COMPLETED_TRIP)).isEqualTo(Timestamp.from(COMPLETED_AT));
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

            Flyway.configure().dataSource(source).target("35").load().migrate();
            otherJdbc.update(
                    "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, visibility,"
                            + " published, created_at) VALUES (?, ?, ?, ?, '{}', 'ACTIVE', 'PUBLIC', false, ?)",
                    UUID.randomUUID(),
                    ANA,
                    "A state ADR-020 renamed away",
                    "nowhere",
                    Timestamp.from(CREATED_AT));

            assertThat(
                            org.assertj.core.api.Assertions.catchThrowable(
                                    () -> Flyway.configure().dataSource(source).target("36").load().migrate()))
                    .as("an unclassifiable value would survive the UPDATE and fail far away, at read time")
                    .isNotNull()
                    .hasMessageContaining("DRAFT, UPCOMING, ONGOING or COMPLETED");
        } finally {
            other.stop();
        }
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure().dataSource(dataSource).target(version).load();
    }

    private static void seedLegacyTrip(
            UUID id, String title, String state, Instant startedAt, Instant completedAt) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, visibility,"
                        + " published, created_at, started_at, completed_at)"
                        + " VALUES (?, ?, ?, ?, '{}', ?, 'PUBLIC', false, ?, ?, ?)",
                id,
                ANA,
                title,
                "nowhere",
                state,
                Timestamp.from(CREATED_AT),
                startedAt == null ? null : Timestamp.from(startedAt),
                completedAt == null ? null : Timestamp.from(completedAt));
    }

    private static Integer draftRowCount() {
        return jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE state = 'DRAFT'", Integer.class);
    }

    private static String stateOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }

    private static Timestamp startedAtOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT started_at FROM itinerary WHERE id = ?", Timestamp.class, itineraryId);
    }

    private static Timestamp completedAtOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT completed_at FROM itinerary WHERE id = ?", Timestamp.class, itineraryId);
    }
}
