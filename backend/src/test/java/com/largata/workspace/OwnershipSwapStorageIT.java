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
import org.springframework.transaction.support.TransactionTemplate;


@SpringBootTest
class OwnershipSwapStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;


    @Autowired private TransactionTemplate transactions;

    @Test
    void aTransferSwapsBothRowsAndLeavesExactlyOneOwner() {
        UUID alice = UUID.randomUUID();
        UUID bob = UUID.randomUUID();
        UUID trip = tripOwnedBy(alice, bob);

        transactions.executeWithoutResult(tx -> workspaces.transferOwnership(trip, alice, bob));

        assertThat(roleOf(trip, bob)).isEqualTo("OWNER");
        assertThat(roleOf(trip, alice)).isEqualTo("MEMBER");
        assertThat(ownerCount(trip)).isEqualTo(1);
    }


    @Test
    void aSecondTransferFromAStaleOwnerIsRefused() {
        UUID alice = UUID.randomUUID();
        UUID bob = UUID.randomUUID();
        UUID carol = UUID.randomUUID();
        UUID trip = tripOwnedBy(alice, bob, carol);
        transactions.executeWithoutResult(tx -> workspaces.transferOwnership(trip, alice, bob));

        assertThatThrownBy(
                        () ->
                                transactions.executeWithoutResult(
                                        tx -> workspaces.transferOwnership(trip, alice, carol)))
                .as("the conditional demote must refuse a transfer from a traveler who no longer owns it")
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no longer holds it");

        assertThat(ownerCount(trip)).isEqualTo(1);
        assertThat(roleOf(trip, bob)).isEqualTo("OWNER");
        assertThat(roleOf(trip, carol)).isEqualTo("MEMBER");
    }


    @Test
    void aTransferToSomebodyWhoLeftLeavesTheOwnerInPlace() {
        UUID alice = UUID.randomUUID();
        UUID departed = UUID.randomUUID();
        UUID trip = tripOwnedBy(alice);

        assertThatThrownBy(
                        () ->
                                transactions.executeWithoutResult(
                                        tx -> workspaces.transferOwnership(trip, alice, departed)))
                .as("promoting a non-member would leave the workspace ownerless once alice is demoted")
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ownerless");

        assertThat(ownerCount(trip)).isEqualTo(1);
        assertThat(roleOf(trip, alice)).isEqualTo("OWNER");
    }

    @Test
    void ownershipCannotTransferToItsOwnHolder() {
        UUID alice = UUID.randomUUID();
        UUID trip = tripOwnedBy(alice);

        assertThatThrownBy(
                        () ->
                                transactions.executeWithoutResult(
                                        tx -> workspaces.transferOwnership(trip, alice, alice)))
                .isInstanceOf(IllegalStateException.class);

        assertThat(ownerCount(trip)).isEqualTo(1);
    }



    private UUID tripOwnedBy(UUID ownerId, UUID... memberIds) {
        Itinerary itinerary = itineraries.create(ownerId, "Nagano", "Nagano", null, null);
        for (UUID memberId : memberIds) {
            transactions.executeWithoutResult(
                    tx -> workspaces.admitMember(itinerary.id(), memberId, Instant.now()));
        }
        return itinerary.id();
    }

    private String roleOf(UUID itineraryId, UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT m.role FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                        + "WHERE w.itinerary_id = ? AND m.traveler_id = ?",
                String.class,
                itineraryId,
                travelerId);
    }

    private int ownerCount(UUID itineraryId) {
        Integer count =
                jdbc.queryForObject(
                        "SELECT count(*) FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ? AND m.role = ?",
                        Integer.class,
                        itineraryId,
                        Role.OWNER.name());
        return count == null ? 0 : count;
    }
}
