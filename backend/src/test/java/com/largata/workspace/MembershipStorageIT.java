package com.largata.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class MembershipStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private WorkspaceService workspaces;


    @Autowired private org.springframework.transaction.support.TransactionTemplate transactions;

    @Test
    void theRoleColumnHoldsTheEnumsName() {
        Itinerary itinerary = itineraries.create(UUID.randomUUID(), "Sapporo", List.of("Sapporo"), null, null);

        String stored =
                jdbc.queryForObject(
                        "SELECT m.role FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ?",
                        String.class,
                        itinerary.id());

        assertThat(stored)
                .as("V4's partial unique index tests role = 'OWNER'; this is that value")
                .isEqualTo(Role.OWNER.name())
                .isEqualTo("OWNER");
    }


    @Test
    void aWorkspaceCannotHaveTwoOwners() {
        Itinerary itinerary = itineraries.create(UUID.randomUUID(), "Hakone", List.of("Hakone"), null, null);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) "
                                                + "VALUES (?, ?, 'OWNER', ?)",
                                        workspaceId,
                                        UUID.randomUUID(),
                                        java.sql.Timestamp.from(Instant.now())))
                .as("membership_one_owner_idx refuses the second owner")
                .isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
    }


    @Test
    void theOwnersMembershipCannotBeDestroyed() {
        UUID ownerId = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(ownerId, "Nikko", List.of("Nikko"), null, null);

        assertThatThrownBy(() -> transactions.executeWithoutResult(tx -> workspaces.removeMember(itinerary.id(), ownerId)))
                .as("the last owner's row is not deletable — ownership transfers, it is never deleted")
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("INV-4");

        Integer owners =
                jdbc.queryForObject(
                        "SELECT count(*) FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ? AND m.role = 'OWNER'",
                        Integer.class,
                        itinerary.id());
        assertThat(owners).isEqualTo(1);
    }


    @Test
    void aMembersMembershipIsDestroyedByTheSameCall() {
        UUID ownerId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(ownerId, "Kamakura", List.of("Kamakura"), null, null);
        UUID workspaceId =
                jdbc.queryForObject("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                memberId,
                java.sql.Timestamp.from(Instant.now()));

        Boolean removed =
                transactions.execute(tx -> workspaces.removeMember(itinerary.id(), memberId));

        assertThat(removed).isTrue();
        assertThat(workspaces.roleOf(itinerary.id(), memberId)).isEmpty();
        Boolean removedAgain = transactions.execute(tx -> workspaces.removeMember(itinerary.id(), memberId));
        assertThat(removedAgain).isFalse();
    }


    @Test
    void aWorkspaceCanHaveManyMembers() {
        Itinerary itinerary = itineraries.create(UUID.randomUUID(), "Otaru", List.of("Otaru"), null, null);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());

        for (int i = 0; i < 3; i++) {
            jdbc.update(
                    "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                    workspaceId,
                    UUID.randomUUID(),
                    java.sql.Timestamp.from(Instant.now()));
        }

        Integer members =
                jdbc.queryForObject(
                        "SELECT count(*) FROM membership WHERE workspace_id = ? AND role = 'MEMBER'",
                        Integer.class,
                        workspaceId);
        assertThat(members).isEqualTo(3);
    }
}
