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


class WorkspaceStateBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BEN = UUID.randomUUID();


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

        flywayTo("12").migrate();

        seedLegacyTrip(A_COMPLETED_TRIP, ANA, "Hokkaido", "COMPLETED");
        seedLegacyTrip(A_DRAFT_TRIP, ANA, "Osaka in spring", "DRAFT");
        seedLegacyTrip(AN_ACTIVE_TRIP, BEN, "Palawan", "ACTIVE");

        assertThat(hasStateColumn()).as("the fixture is genuinely pre-V13").isFalse();

        flywayTo("13").migrate();
    }


    @Test
    void completedTripsWorkspaceBecomesCOMPLETED() {
        assertThat(stateOf(A_COMPLETED_TRIP)).isEqualTo("COMPLETED");
    }


    @Test
    void liveTripsWorkspacesBecomeACTIVE() {
        assertThat(stateOf(A_DRAFT_TRIP)).isEqualTo("ACTIVE");
        assertThat(stateOf(AN_ACTIVE_TRIP)).isEqualTo("ACTIVE");
    }


    @Test
    void noRowIsBackfilledAsArchived() {
        assertThat(count("SELECT count(*) FROM workspace WHERE state = 'ARCHIVED'")).isZero();
    }


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
