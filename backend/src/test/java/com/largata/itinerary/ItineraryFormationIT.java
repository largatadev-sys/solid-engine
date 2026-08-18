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


@SpringBootTest
class ItineraryFormationIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;


    @Autowired private WorkspaceService workspaces;

    @Test
    void creatingAnItineraryFormsItsWorkspaceWithTheCreatorAsOwner() {
        UUID owner = UUID.randomUUID();

        Itinerary itinerary = itineraries.create(owner, "Osaka", "Osaka", null, null);

        assertThat(workspaceIdFor(itinerary.id())).as("a workspace formed around the itinerary").isNotNull();
        assertThat(roleOf(itinerary.id(), owner)).isEqualTo("OWNER");
    }


    @Test
    void theWorkspaceAndTheOwnerMembershipInheritTheItinerarysInstant() {
        UUID owner = UUID.randomUUID();

        Itinerary itinerary = itineraries.create(owner, "Kyoto", "Kyoto", null, null);

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


    @Test
    void aSecondWorkspaceForTheSameItineraryIsImpossible() {
        UUID owner = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(owner, "Tokyo", "Tokyo", null, null);

        assertThatThrownBy(
                        () ->
                                inTransaction(
                                        () ->
                                                workspaces.formAround(
                                                        itinerary.id(), UUID.randomUUID(), Instant.now())))
                .as("the UNIQUE on workspace.itinerary_id refuses the second one")
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }


    @Test
    void formingAWorkspaceOutsideATransactionIsRefused() {
        assertThatThrownBy(() -> workspaces.formAround(UUID.randomUUID(), UUID.randomUUID(), Instant.now()))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    }

    @Test
    void flywayRanTheWorkspaceMigration() {
        Integer applied =
                jdbc.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE version = '4' AND success = true",
                        Integer.class);

        assertThat(applied).isEqualTo(1);
    }


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
}
