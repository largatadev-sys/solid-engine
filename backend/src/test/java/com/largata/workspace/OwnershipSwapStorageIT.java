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

/**
 * The INV-4 defence inside {@link WorkspaceService#transferOwnership} — spec AC 7 (S1.6).
 *
 * <p><strong>Why this exists as its own class, below the HTTP contract tests.</strong> The swap's
 * conditional demote ({@code WHERE role = 'OWNER'}, count checked) is what resolves two racing
 * transfers to exactly one owner. Every test above this layer drives one transfer at a time and would
 * stay green if that predicate were deleted — so the guard would be code nobody's tests defend, which
 * is the exact shape of the S1.1 partial-index near-miss the storage ITs exist to prevent.
 *
 * <p><strong>Verified to fail:</strong> removing {@code AND m.role = :expectedRole} from {@code
 * MembershipRepository.changeRole} makes {@link #aSecondTransferFromAStaleOwnerIsRefused} fail with two
 * owners on one workspace. A guard test that cannot fail is not a guard test.
 */
@SpringBootTest
class OwnershipSwapStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;

    /** {@code transferOwnership} is {@code MANDATORY} — uncallable without a caller's transaction. */
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

    /**
     * The race, played out deterministically: two transfers both believing Alice is the owner. The
     * second one's demote matches zero rows — Alice is a member by then — so it refuses instead of
     * promoting a second owner or leaving the workspace with none.
     *
     * <p>Sequential rather than threaded on purpose: the interesting state is "the caller's idea of who
     * owns this is stale", which two sequential calls reproduce exactly and reliably. Two threads would
     * test the same predicate through a flaky harness.
     */
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

        // The invariant survived the refusal: Bob owns it, alone, and Carol was not promoted.
        assertThat(ownerCount(trip)).isEqualTo(1);
        assertThat(roleOf(trip, bob)).isEqualTo("OWNER");
        assertThat(roleOf(trip, carol)).isEqualTo("MEMBER");
    }

    /**
     * The other half of the count check: the target vanished (a concurrent departure) between the
     * offer ladder's check and the swap. Failing loud is the only correct answer — the alternative is a
     * workspace with no owner at all, the one state V4's partial index cannot catch.
     */
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

        // The transaction rolled back, so Alice's demote went with it — INV-4 intact.
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

    // --- fixtures -----------------------------------------------------------------------------------

    /** A trip owned by the first traveler, with the rest admitted as members. */
    private UUID tripOwnedBy(UUID ownerId, UUID... memberIds) {
        Itinerary itinerary = itineraries.create(ownerId, "Nagano", List.of("Nagano"), null, null);
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
