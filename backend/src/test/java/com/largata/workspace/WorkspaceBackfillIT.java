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


class WorkspaceBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;


    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BEN = UUID.randomUUID();
    private static final UUID ANAS_FIRST_TRIP = UUID.randomUUID();
    private static final UUID ANAS_SECOND_TRIP = UUID.randomUUID();
    private static final UUID BENS_TRIP = UUID.randomUUID();


    private static final Instant ANAS_FIRST_CREATED_AT =
            Instant.parse("2026-03-01T09:15:30Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant ANAS_SECOND_CREATED_AT =
            Instant.parse("2026-05-20T18:45:00Z").truncatedTo(ChronoUnit.MICROS);

    private static final Instant BENS_CREATED_AT =
            Instant.parse("2026-06-11T04:00:01Z").truncatedTo(ChronoUnit.MICROS);


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

        flywayTo("4").migrate();

        seedLegacyItinerary(ANAS_FIRST_TRIP, ANA, "Osaka in spring", ANAS_FIRST_CREATED_AT);
        seedLegacyItinerary(ANAS_SECOND_TRIP, ANA, "Hokkaido", ANAS_SECOND_CREATED_AT);
        seedLegacyItinerary(BENS_TRIP, BEN, "Palawan", BENS_CREATED_AT);

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


    @Test
    void backfilledTimestampsAreInheritedFromTheItineraryNotTheMigration() {
        assertThat(workspaceCreatedAt(ANAS_FIRST_TRIP)).isEqualTo(ANAS_FIRST_CREATED_AT);
        assertThat(workspaceCreatedAt(ANAS_SECOND_TRIP)).isEqualTo(ANAS_SECOND_CREATED_AT);
        assertThat(workspaceCreatedAt(BENS_TRIP)).isEqualTo(BENS_CREATED_AT);
        assertThat(joinedAt(ANAS_FIRST_TRIP)).isEqualTo(ANAS_FIRST_CREATED_AT);
        assertThat(joinedAt(BENS_TRIP)).isEqualTo(BENS_CREATED_AT);
    }


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
        List<Instant> instantsInIdOrder =
                rows.stream().map(r -> ((Timestamp) r.get("created_at")).toInstant()).toList();
        assertThat(instantsInIdOrder)
                .as("v7 ids sort by the itinerary's creation time")
                .containsExactly(ANAS_FIRST_CREATED_AT, ANAS_SECOND_CREATED_AT, BENS_CREATED_AT);
    }


    @Test
    void reRunningTheBackfillStatementsChangesNothing() {
        int workspacesBefore = count("SELECT count(*) FROM workspace");
        int membershipsBefore = count("SELECT count(*) FROM membership");

        jdbc.execute(backfillSql());

        assertThat(count("SELECT count(*) FROM workspace")).isEqualTo(workspacesBefore);
        assertThat(count("SELECT count(*) FROM membership")).isEqualTo(membershipsBefore);
    }


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
