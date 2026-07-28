package com.largata.workspace;

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

/**
 * V13's state backfill, run against the one thing no other test in this repo can produce: <strong>a
 * database that already contains workspaces created before the {@code state} column existed</strong>
 * (S1.9 ticket 01, spec AC 9).
 *
 * <p><strong>Why this class exists</strong> — the reasoning is {@link WorkspaceBackfillIT}'s, and it is
 * a standing rule in CLAUDE.md rather than a one-off: every test surface this repo owns is
 * structurally blind to a data migration. The local stack is fresh-DB-every-redeploy, Testcontainers
 * boots empty schemas, CI likewise; on all of them V13's UPDATE touches zero rows, does nothing, and
 * reports success — so the suite is green whether the mapping is right, subtly wrong, or a typo. The
 * only databases holding rows it targets are the deployed rungs, and deployed {@code dev} carries
 * completed trips from S1.7's verification. Untested, V13's first real execution would be its
 * production run.
 *
 * <p><strong>Its own container, not {@link com.largata.support.PostgresTestBase}'s singleton</strong> —
 * that one is shared by the whole run and fully migrated to head before this class loads, so there is
 * no way to un-apply V13 on it and stepping it would corrupt every other test's schema.
 *
 * <p><strong>The fixture stops at V12, not earlier, deliberately.</strong> A legacy row must look like
 * a real one, and after S1.7 a completed itinerary carries {@code completed_at}. Seeding at V11 would
 * produce a completed trip with no completion stamp — a shape that has never existed on any rung, so
 * the test would be exercising the mapping against fiction.
 *
 * <p><strong>Sabotage-verified</strong> (S1.1's rule — a migration test that passes against a no-op is
 * worse than none): inverting V13's {@code CASE} arms was confirmed to fail
 * {@code completedTripsWorkspaceBecomesCOMPLETED} and {@code liveTripsWorkspacesBecomeACTIVE} with the
 * right diagnosis, then reverted. See this class's ticket comment for the run.
 */
class WorkspaceStateBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BEN = UUID.randomUUID();

    /** The legacy shapes, one per branch of V13's CASE — and one for each arm's neighbours. */
    private static final UUID A_COMPLETED_TRIP = UUID.randomUUID();

    private static final UUID A_DRAFT_TRIP = UUID.randomUUID();
    private static final UUID AN_ACTIVE_TRIP = UUID.randomUUID();

    private static final Instant CREATED_AT = Instant.parse("2026-04-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        // 1. The world as it stood before this story: workspaces exist, and not one has a state.
        flywayTo("12").migrate();

        // 2. The legacy shape, in raw SQL on purpose — going through ItineraryService would write the
        //    state column (which is the very thing the fixture must lack) and destroy the test.
        seedLegacyTrip(A_COMPLETED_TRIP, ANA, "Hokkaido", "COMPLETED");
        seedLegacyTrip(A_DRAFT_TRIP, ANA, "Osaka in spring", "DRAFT");
        seedLegacyTrip(AN_ACTIVE_TRIP, BEN, "Palawan", "ACTIVE");

        assertThat(hasStateColumn()).as("the fixture is genuinely pre-V13").isFalse();

        // 3. The subject under test.
        flywayTo("13").migrate();
    }

    /**
     * The mapping's whole point: a trip that completed before this column existed must come out
     * {@code COMPLETED}, not {@code ACTIVE}.
     *
     * <p>This is the assertion the deployed rungs actually depend on — {@code dev} holds completed
     * trips from S1.7's verification right now, and every one of them would otherwise report its
     * workspace as live forever, with the two halves of a 1:1 permanently disagreeing.
     */
    @Test
    void completedTripsWorkspaceBecomesCOMPLETED() {
        assertThat(stateOf(A_COMPLETED_TRIP)).isEqualTo("COMPLETED");
    }

    /** Everything not completed derives to {@code ACTIVE} — draft and active alike. */
    @Test
    void liveTripsWorkspacesBecomeACTIVE() {
        assertThat(stateOf(A_DRAFT_TRIP)).isEqualTo("ACTIVE");
        assertThat(stateOf(AN_ACTIVE_TRIP)).isEqualTo("ACTIVE");
    }

    /**
     * <strong>Nothing is born archived.</strong> Archive has never existed, so a migration that could
     * produce an {@code ARCHIVED} row would be inventing history — and it would do so silently, by
     * freezing a trip whose owner never asked for it.
     */
    @Test
    void noRowIsBackfilledAsArchived() {
        assertThat(count("SELECT count(*) FROM workspace WHERE state = 'ARCHIVED'")).isZero();
    }

    /**
     * Every row got a value, and the column says so structurally.
     *
     * <p>The {@code NOT NULL} is the migration's own safety net (V13's closing note): a workspace whose
     * itinerary vanished would escape the UPDATE's join and fail the migration loudly here, rather than
     * leaving a null that the write fence would later read as "not archived" — silently permitting
     * writes on a trip somebody meant to freeze.
     */
    @Test
    void everyWorkspaceHasAStateAndTheColumnIsNotNullable() {
        assertThat(count("SELECT count(*) FROM workspace")).isEqualTo(3);
        assertThat(count("SELECT count(*) FROM workspace WHERE state IS NOT NULL")).isEqualTo(3);
        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT is_nullable FROM information_schema.columns
                                 WHERE table_name = 'workspace' AND column_name = 'state'
                                """,
                                String.class))
                .isEqualTo("NO");
    }

    /** Upper-case, the enum's name — the spelling every future predicate on this column inherits. */
    @Test
    void backfilledStatesUseTheEnumNameSpelling() {
        assertThat(jdbc.queryForList("SELECT DISTINCT state FROM workspace", String.class))
                .as("the V4 lesson: a lower-case spelling matches nothing, silently")
                .containsOnly("ACTIVE", "COMPLETED");
    }

    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }

    /**
     * A pre-V13 trip: itinerary, workspace, owner membership — the shape S1.1's formation produced and
     * V5's backfill wrote, with no state column in sight.
     */
    private static void seedLegacyTrip(UUID itineraryId, UUID ownerId, String title, String itineraryState) {
        Timestamp at = Timestamp.from(CREATED_AT);
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, state, visibility, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, 'PRIVATE', ?)",
                itineraryId,
                ownerId,
                title,
                new String[] {"somewhere"},
                itineraryState,
                at);
        UUID workspaceId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO workspace (id, itinerary_id, created_at) VALUES (?, ?, ?)", workspaceId, itineraryId, at);
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'OWNER', ?)",
                workspaceId,
                ownerId,
                at);
    }

    private static boolean hasStateColumn() {
        return count(
                        """
                        SELECT count(*) FROM information_schema.columns
                         WHERE table_name = 'workspace' AND column_name = 'state'
                        """)
                > 0;
    }

    private static String stateOf(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM workspace WHERE itinerary_id = ?", String.class, itineraryId);
    }

    private static int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }
}
