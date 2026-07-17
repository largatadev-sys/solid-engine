package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.support.PostgresTestBase;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Ticket 01's ACs: creating an itinerary forms its Workspace, atomically (S1.1, AC 1/2/7).
 *
 * <p>The story's invariant is "no itinerary exists without a workspace", and <strong>only the
 * failure case proves it</strong> — a happy path cannot tell one transaction from two that both
 * happened to work. {@link #workspaceFailureRollsBackTheItinerary} is therefore the test that
 * matters most in this class.
 */
@SpringBootTest
class ItineraryFormationIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;

    /** The real service — this class proves formation happens, never that it can be made to fail. */
    @Autowired private WorkspaceService workspaces;

    @Test
    void creatingAnItineraryFormsItsWorkspaceWithTheCreatorAsOwner() {
        UUID owner = UUID.randomUUID();

        Itinerary itinerary = itineraries.create(owner, "Osaka", List.of("Osaka"), null, null);

        assertThat(workspaceIdFor(itinerary.id())).as("a workspace formed around the itinerary").isNotNull();
        assertThat(roleOf(itinerary.id(), owner)).isEqualTo("OWNER");
    }

    /**
     * AC 1's timestamp half. The workspace exists from the itinerary's first instant (Artifact 03),
     * so its stamps are the itinerary's — not {@code now()}. Getting this wrong is invisible in
     * every functional test and fabricates an "everyone joined on migration day" artifact that only
     * shows up when someone asks a question of the history years later.
     */
    @Test
    void theWorkspaceAndTheOwnerMembershipInheritTheItinerarysInstant() {
        UUID owner = UUID.randomUUID();

        Itinerary itinerary = itineraries.create(owner, "Kyoto", List.of("Kyoto"), null, null);

        Instant itineraryCreatedAt = instantOf("SELECT created_at FROM itinerary WHERE id = ?", itinerary.id());
        Instant workspaceCreatedAt =
                instantOf("SELECT created_at FROM workspace WHERE itinerary_id = ?", itinerary.id());
        Instant joinedAt =
                instantOf(
                        "SELECT m.joined_at FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ?",
                        itinerary.id());

        assertThat(workspaceCreatedAt).isEqualTo(itineraryCreatedAt);
        assertThat(joinedAt).isEqualTo(itineraryCreatedAt);
    }

    /**
     * AC 7 — the 1:1 is structural (V4's UNIQUE), not disciplinary. ADR-011's assumption that
     * "resolving by itinerary id stays the natural key" rests on this cardinality, so the schema
     * enforces it rather than trusting every future caller of {@code formAround}.
     */
    @Test
    void aSecondWorkspaceForTheSameItineraryIsImpossible() {
        UUID owner = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(owner, "Tokyo", List.of("Tokyo"), null, null);

        assertThatThrownBy(
                        () ->
                                inTransaction(
                                        () ->
                                                workspaces.formAround(
                                                        itinerary.id(), UUID.randomUUID(), Instant.now())))
                .as("the UNIQUE on workspace.itinerary_id refuses the second one")
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    /**
     * {@code formAround} is {@link org.springframework.transaction.annotation.Propagation#MANDATORY}:
     * called without a transaction it refuses, rather than quietly opening its own and committing a
     * workspace whose itinerary may still roll back. The silent version of this bug is exactly the
     * shape this codebase keeps paying for.
     */
    @Test
    void formingAWorkspaceOutsideATransactionIsRefused() {
        assertThatThrownBy(() -> workspaces.formAround(UUID.randomUUID(), UUID.randomUUID(), Instant.now()))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    }

    @Test
    void flywayRanTheWorkspaceMigration() {
        // The S0.1 lesson, repeated per migration: every other test here would pass against a
        // hand-created table. Only the history proves the migration pipeline built the schema.
        Integer applied =
                jdbc.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE version = '4' AND success = true",
                        Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    /** {@code formAround} is MANDATORY, so tests that call it directly must supply the transaction. */
    private void inTransaction(Runnable work) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> work.run());
    }

    private UUID workspaceIdFor(UUID itineraryId) {
        List<UUID> found =
                jdbc.queryForList("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itineraryId);
        return found.isEmpty() ? null : found.getFirst();
    }

    private String roleOf(UUID itineraryId, UUID travelerId) {
        List<String> found =
                jdbc.queryForList(
                        "SELECT m.role FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ? AND m.traveler_id = ?",
                        String.class,
                        itineraryId,
                        travelerId);
        return found.isEmpty() ? null : found.getFirst();
    }

    private Instant instantOf(String sql, Object arg) {
        return jdbc.queryForObject(sql, java.sql.Timestamp.class, arg).toInstant();
    }

    private int itineraryCountFor(UUID ownerId) {
        return jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE owner_id = ?", Integer.class, ownerId);
    }
}
