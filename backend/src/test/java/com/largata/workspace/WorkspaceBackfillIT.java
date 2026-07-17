package com.largata.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * V5's backfill, run against the one thing no other test in this repo can produce: <strong>a database
 * that already contains pre-E1 itineraries</strong> (S1.1 spec §The backfill's testing trap, AC 5).
 *
 * <p><strong>Why this class exists at all.</strong> Every test surface we own is structurally blind
 * to this migration. The local stack is fresh-DB-every-redeploy; Testcontainers boots empty schemas;
 * CI likewise. On all of them V5 runs against zero rows, does nothing, and reports success — so the
 * suite would be green whether the SQL were correct, subtly wrong, or a no-op typo. The only
 * database that actually holds pre-E1 itineraries is deployed `dev`, carrying the founders' real
 * trips. Untested, V5's first real execution would be its production run. This class manufactures
 * the legacy shape instead: Flyway stops at V4, legacy rows go in, then V5 is applied on its own and
 * its effects are asserted. (Same family as S0.2's {@code getTokens()}: green everywhere except the
 * one environment that ships.)
 *
 * <p><strong>Its own container, not {@link com.largata.support.PostgresTestBase}'s singleton.</strong>
 * That one is shared by every test in the run and is fully migrated before this class is even
 * loaded — there is no way to un-apply V5 on it, and stepping it would corrupt every other test's
 * schema. This class needs a database it can drive migration-by-migration, so it owns one. The cost
 * is one extra container per run; the alternative is not testing the migration.
 *
 * <p>No Spring context: the subject is SQL and Flyway, and a {@code @SpringBootTest} would migrate
 * the schema to head on startup — the precise thing this test must prevent.
 */
class WorkspaceBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    /** The pre-E1 fixture: two itineraries for one owner, one for another, none with a workspace. */
    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BEN = UUID.randomUUID();
    private static final UUID ANAS_FIRST_TRIP = UUID.randomUUID();
    private static final UUID ANAS_SECOND_TRIP = UUID.randomUUID();
    private static final UUID BENS_TRIP = UUID.randomUUID();

    /** Deliberately old and distinct: the assertions below check these instants come back exactly. */
    private static final Instant ANAS_FIRST_CREATED_AT =
            Instant.parse("2026-03-01T09:15:30Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant ANAS_SECOND_CREATED_AT =
            Instant.parse("2026-05-20T18:45:00Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant BENS_CREATED_AT =
            Instant.parse("2026-06-11T04:00:01Z").truncatedTo(ChronoUnit.MICROS);

    /** The dev-rung case: an itinerary whose workspace ticket 01's code already formed. */
    private static final UUID ALREADY_FORMED_TRIP = UUID.randomUUID();

    private static final UUID PRE_EXISTING_WORKSPACE = UUID.randomUUID();

    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        // 1. The world as it stood before this story: itinerary exists, workspace tables exist
        //    (V4 created them), and not one workspace row does.
        flywayTo("4").migrate();

        // 2. The legacy shape. Inserted as raw SQL on purpose — going through ItineraryService would
        //    form workspaces (that is ticket 01's whole point) and destroy the fixture.
        seedLegacyItinerary(ANAS_FIRST_TRIP, ANA, "Osaka in spring", ANAS_FIRST_CREATED_AT);
        seedLegacyItinerary(ANAS_SECOND_TRIP, ANA, "Hokkaido", ANAS_SECOND_CREATED_AT);
        seedLegacyItinerary(BENS_TRIP, BEN, "Palawan", BENS_CREATED_AT);

        // 3. A workspace that already exists — the dev-rung case: an itinerary created after V4
        //    deployed and before V5 ran has its workspace already, and the backfill must skip it.
        //    (If it did not, V4's UNIQUE would abort the migration and take the deploy with it.)
        seedLegacyItinerary(ALREADY_FORMED_TRIP, BEN, "Boracay", BENS_CREATED_AT);
        jdbc.update(
                "INSERT INTO workspace (id, itinerary_id, created_at) VALUES (?, ?, ?)",
                PRE_EXISTING_WORKSPACE,
                ALREADY_FORMED_TRIP,
                Timestamp.from(BENS_CREATED_AT));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'OWNER', ?)",
                PRE_EXISTING_WORKSPACE,
                BEN,
                Timestamp.from(BENS_CREATED_AT));

        assertThat(count("SELECT count(*) FROM workspace")).as("the fixture is the legacy shape").isEqualTo(1);

        // 4. The subject under test.
        flywayTo("5").migrate();
    }

    @Test
    void everyPreE1ItineraryGainsAWorkspace() {
        assertThat(count("SELECT count(*) FROM itinerary")).isEqualTo(4);
        assertThat(count("SELECT count(*) FROM workspace")).isEqualTo(4);
        assertThat(count("SELECT count(*) FROM workspace w JOIN itinerary i ON i.id = w.itinerary_id"))
                .as("every workspace belongs to a real itinerary")
                .isEqualTo(4);
    }

    @Test
    void everyBackfilledWorkspaceHasItsItinerarysOwnerAsOwner() {
        assertThat(ownerOf(ANAS_FIRST_TRIP)).isEqualTo(ANA);
        assertThat(ownerOf(ANAS_SECOND_TRIP)).isEqualTo(ANA);
        assertThat(ownerOf(BENS_TRIP)).isEqualTo(BEN);
        assertThat(count("SELECT count(*) FROM membership")).as("one owner each, no strays").isEqualTo(4);
        assertThat(count("SELECT count(*) FROM membership WHERE role = 'OWNER'")).isEqualTo(4);
    }

    /**
     * AC 5's timestamp half — and the assertion most likely to have been written wrong, since a
     * {@code now()} default would pass every other test in this class.
     */
    @Test
    void backfilledTimestampsAreInheritedFromTheItineraryNotTheMigration() {
        assertThat(workspaceCreatedAt(ANAS_FIRST_TRIP)).isEqualTo(ANAS_FIRST_CREATED_AT);
        assertThat(workspaceCreatedAt(ANAS_SECOND_TRIP)).isEqualTo(ANAS_SECOND_CREATED_AT);
        assertThat(workspaceCreatedAt(BENS_TRIP)).isEqualTo(BENS_CREATED_AT);
        assertThat(joinedAt(ANAS_FIRST_TRIP)).isEqualTo(ANAS_FIRST_CREATED_AT);
        assertThat(joinedAt(BENS_TRIP)).isEqualTo(BENS_CREATED_AT);
    }

    /** The dev-rung case: a workspace that already existed is left exactly as it was. */
    @Test
    void anExistingWorkspaceIsUntouched() {
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, ALREADY_FORMED_TRIP);

        assertThat(workspaceId).as("not replaced, not duplicated").isEqualTo(PRE_EXISTING_WORKSPACE);
        assertThat(
                        count(
                                "SELECT count(*) FROM membership WHERE workspace_id = '"
                                        + PRE_EXISTING_WORKSPACE
                                        + "'"))
                .as("its membership was not duplicated")
                .isEqualTo(1);
    }

    /**
     * Backfilled ids are UUIDv7 like every other id in the system, and they sort by the itinerary's
     * creation time. {@code gen_random_uuid()} would have minted v4s — working today, and a silent
     * inconsistency in exactly the column whose sortability the list query depends on (V3's note).
     */
    @Test
    void backfilledWorkspaceIdsAreVersion7AndSortByTheTripsInstant() {
        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "SELECT w.id, i.created_at FROM workspace w JOIN itinerary i ON i.id = w.itinerary_id "
                                + "WHERE w.itinerary_id IN (?, ?, ?) ORDER BY w.id",
                        ANAS_FIRST_TRIP,
                        ANAS_SECOND_TRIP,
                        BENS_TRIP);

        assertThat(rows).hasSize(3);
        for (Map<String, Object> row : rows) {
            assertThat(versionOf((UUID) row.get("id"))).as("UUID version nibble").isEqualTo(7);
        }
        // Ordering by id must equal ordering by the trip's instant — that is what v7 buys.
        List<Instant> instantsInIdOrder =
                rows.stream().map(r -> ((Timestamp) r.get("created_at")).toInstant()).toList();
        assertThat(instantsInIdOrder)
                .as("v7 ids sort by the itinerary's creation time")
                .containsExactly(ANAS_FIRST_CREATED_AT, ANAS_SECOND_CREATED_AT, BENS_CREATED_AT);
    }

    /**
     * Running the backfill's statements a second time changes nothing.
     *
     * <p>Flyway makes a true re-run impossible, so this is belt-and-braces — but cheap, and it pins
     * the {@code WHERE NOT EXISTS} clauses as the thing doing the work rather than the version table
     * hiding a migration that would double every row if it ever ran twice (a hand-run during an
     * incident, a squashed baseline, a restored snapshot replayed).
     *
     * <p>It re-executes the file's SQL directly rather than cleaning and re-migrating: this class's
     * fixture is built once in {@code @BeforeAll} and the other tests read it, so a test that reset
     * the database would break them depending on JUnit's method order.
     */
    @Test
    void reRunningTheBackfillStatementsChangesNothing() {
        int workspacesBefore = count("SELECT count(*) FROM workspace");
        int membershipsBefore = count("SELECT count(*) FROM membership");

        jdbc.execute(backfillSql());

        assertThat(count("SELECT count(*) FROM workspace")).isEqualTo(workspacesBefore);
        assertThat(count("SELECT count(*) FROM membership")).isEqualTo(membershipsBefore);
    }

    /** The migration's own SQL, read from the classpath — never a paraphrase of it. */
    private static String backfillSql() {
        try (var in = WorkspaceBackfillIT.class.getResourceAsStream("/db/migration/V5__backfill_workspaces.sql")) {
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("V5 must be readable from the classpath", e);
        }
    }

    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }

    private static void seedLegacyItinerary(UUID id, UUID ownerId, String title, Instant createdAt) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, state, visibility, created_at) "
                        + "VALUES (?, ?, ?, ?, 'DRAFT', 'PRIVATE', ?)",
                id,
                ownerId,
                title,
                new String[] {"somewhere"},
                Timestamp.from(createdAt));
    }

    private static int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    private UUID ownerOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT m.traveler_id FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                        + "WHERE w.itinerary_id = ? AND m.role = 'OWNER'",
                UUID.class,
                itineraryId);
    }

    private Instant workspaceCreatedAt(UUID itineraryId) {
        return jdbc.queryForObject(
                        "SELECT created_at FROM workspace WHERE itinerary_id = ?", Timestamp.class, itineraryId)
                .toInstant();
    }

    private Instant joinedAt(UUID itineraryId) {
        return jdbc.queryForObject(
                        "SELECT m.joined_at FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ?",
                        Timestamp.class,
                        itineraryId)
                .toInstant();
    }

    private static int versionOf(UUID uuid) {
        return (int) ((uuid.getMostSignificantBits() >> 12) & 0x0F);
    }
}
