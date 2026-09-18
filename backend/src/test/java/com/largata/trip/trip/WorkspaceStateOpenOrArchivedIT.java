package com.largata.trip.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class WorkspaceStateOpenOrArchivedIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID A_COMPLETED_TRIP = UUID.randomUUID();
    private static final UUID ANOTHER_COMPLETED_TRIP = UUID.randomUUID();
    private static final UUID AN_ACTIVE_TRIP = UUID.randomUUID();
    private static final UUID AN_ARCHIVED_TRIP = UUID.randomUUID();
    private static final UUID A_PUBLISHED_TRIP = UUID.randomUUID();

    private static final Instant CREATED_AT =
            Instant.parse("2026-05-14T09:00:00Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant PUBLISHED_AT =
            Instant.parse("2026-06-01T12:00:00Z").truncatedTo(ChronoUnit.MICROS);


    @BeforeAll
    static void migrateToTheEveOfV58ThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("57").migrate();

        seedTrip(A_COMPLETED_TRIP, "Hokkaido", "COMPLETED", "COMPLETED", false);
        seedTrip(ANOTHER_COMPLETED_TRIP, "Palawan", "COMPLETED", "COMPLETED", false);
        seedTrip(AN_ACTIVE_TRIP, "Osaka in spring", "ONGOING", "ACTIVE", false);
        seedTrip(AN_ARCHIVED_TRIP, "The one that was deleted", "COMPLETED", "ARCHIVED", false);
        seedTrip(A_PUBLISHED_TRIP, "Cebu, shared", "COMPLETED", "ACTIVE", true);

        assertThat(workspaceStatesPresent())
                .as("the fixture is genuinely pre-V58 — all three values are in the table")
                .contains("COMPLETED", "ACTIVE", "ARCHIVED");
        assertThat(columnExists("published")).as("…and the dead flag is still here").isTrue();
        assertThat(columnExists("published_at")).isTrue();

        flywayTo("58").migrate();
    }


    @Test
    void everyWorkspaceStoringTheLifecycleIsReopened() {
        assertThat(workspaceStateOf(A_COMPLETED_TRIP))
                .as("COMPLETED was a copy of the ITINERARY's lifecycle; the room was never closed")
                .isEqualTo("ACTIVE");
        assertThat(workspaceStateOf(ANOTHER_COMPLETED_TRIP)).isEqualTo("ACTIVE");
    }


    @Test
    void anArchivedWorkspaceIsLeftExactlyWhereItWas() {
        assertThat(workspaceStateOf(AN_ARCHIVED_TRIP))
                .as("archived IS the workspace's own fact — the one thing this migration must not touch")
                .isEqualTo("ARCHIVED");
    }


    @Test
    void anAlreadyActiveWorkspaceIsUntouched() {
        assertThat(workspaceStateOf(AN_ACTIVE_TRIP)).isEqualTo("ACTIVE");
    }


    @Test
    void theLifecycleItWasCopyingIsStillOnTheItineraryRow() {
        assertThat(lifecycleOf(A_COMPLETED_TRIP))
                .as("nothing is lost: the wire projects `completed` by reading THIS column beside the room")
                .isEqualTo("COMPLETED");
        assertThat(lifecycleOf(AN_ACTIVE_TRIP)).isEqualTo("ONGOING");
        assertThat(lifecycleOf(AN_ARCHIVED_TRIP)).isEqualTo("COMPLETED");
    }


    @Test
    void onlyTheTwoRemainingValuesSurviveInTheTable() {
        assertThat(workspaceStatesPresent()).containsOnly("ACTIVE", "ARCHIVED");
    }


    @Test
    void aThirdValueIsRefusedByTheCheckRatherThanStored() {
        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "UPDATE workspace SET state = 'COMPLETED' WHERE itinerary_id = ?",
                                        AN_ACTIVE_TRIP))
                .as("without the CHECK the value simply comes back one day and nothing fails")
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThat(workspaceStateOf(AN_ACTIVE_TRIP)).isEqualTo("ACTIVE");
    }


    @Test
    void theTripsTwoDeadPublicationColumnsAreGone() {
        assertThat(columnExists("published"))
                .as("CM-5 made an unretired ItineraryObject the one truth; the column has been dead since")
                .isFalse();
        assertThat(columnExists("published_at")).isFalse();
    }


    @Test
    void theIndexThatServedThemIsGoneToo() {
        assertThat(indexExists("idx_itinerary_discovery"))
                .as("V32 built it WHERE published = true — a partial index on a dropped predicate")
                .isFalse();
    }


    @Test
    void thePublishedTripsRowSurvivesEverythingButItsFlag() {
        assertThat(titleOf(A_PUBLISHED_TRIP))
                .as("dropping a column is not dropping a trip — the row and its plan stand")
                .isEqualTo("Cebu, shared");
        assertThat(lifecycleOf(A_PUBLISHED_TRIP)).isEqualTo("COMPLETED");
        assertThat(workspaceStateOf(A_PUBLISHED_TRIP)).isEqualTo("ACTIVE");
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }


    private static void seedTrip(
            UUID itineraryId, String title, String lifecycle, String workspaceState, boolean published) {
        Timestamp at = Timestamp.from(CREATED_AT);
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, published,"
                        + " published_at, created_at) VALUES (?, ?, ?, ?, '{}', ?, ?, ?, ?)",
                itineraryId,
                ANA,
                title,
                "somewhere",
                lifecycle,
                published,
                published ? Timestamp.from(PUBLISHED_AT) : null,
                at);
        UUID workspaceId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO workspace (id, itinerary_id, state, created_at) VALUES (?, ?, ?, ?)",
                workspaceId,
                itineraryId,
                workspaceState,
                at);
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'OWNER', ?)",
                workspaceId,
                ANA,
                at);
    }


    private static String workspaceStateOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, itineraryId);
    }


    private static String lifecycleOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }


    private static String titleOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT title FROM itinerary WHERE id = ?", String.class, itineraryId);
    }


    private static java.util.List<String> workspaceStatesPresent() {
        return jdbc.queryForList("SELECT DISTINCT state FROM workspace", String.class);
    }


    private static boolean columnExists(String column) {
        return jdbc.queryForObject(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_name = 'itinerary' AND column_name = ?",
                        Integer.class,
                        column)
                > 0;
    }


    private static boolean indexExists(String index) {
        return jdbc.queryForObject(
                        "SELECT count(*) FROM pg_indexes WHERE indexname = ?", Integer.class, index)
                > 0;
    }
}
