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

/**
 * The contract between {@link Role} and the {@code membership.role} column — pinned, because
 * <strong>V4's INV-4 enforcement silently depends on it</strong>.
 *
 * <p>{@code membership_one_owner_idx} is a partial unique index with the predicate {@code WHERE role
 * = 'OWNER'}. If the column's spelling ever changes — someone adds an {@code AttributeConverter},
 * someone "tidies" {@code @Enumerated} away, someone lower-cases it to match the API's {@code
 * wireName()} — that predicate matches nothing. The index would still be created, still cost
 * nothing, and enforce <em>nothing</em>: two owners per workspace, no error, no failing test
 * anywhere else. INV-4 would be a comment.
 *
 * <p>This was nearly shipped at S1.1: the first draft of V4 wrote {@code WHERE role = 'owner'},
 * copying the lower-case spelling from V3's {@code state} default — which Hibernate overrides with
 * the enum's name on every write, making that default dead weight nobody noticed. The lesson worth
 * keeping: the storage spelling is a contract between Hibernate and SQL, and the API's spelling is a
 * different contract that happens to look similar.
 */
@SpringBootTest
class MembershipStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private WorkspaceService workspaces;

    /**
     * {@code removeMember} is {@code Propagation.MANDATORY} — deliberately uncallable without a
     * caller's transaction, so departure cannot half-commit (spec §3). The test therefore has to supply
     * one, rather than annotating the class {@code @Transactional}: that would roll everything back and
     * hide whether the delete actually reached the database.
     */
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

    /**
     * INV-4's "at most one owner", enforced by the database rather than by service discipline —
     * because ownership transfer (S1.6) and the owner-deletion claim flow will both try to break it
     * under concurrency, and neither exists yet to be trusted.
     */
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

    /**
     * INV-4's <em>other</em> half — "at least one owner" — which no database constraint defends (S1.5).
     *
     * <p>{@code membership_one_owner_idx} enforces <em>at most</em> one owner, so deleting the last one
     * satisfies every constraint in the schema and leaves the workspace ownerless: INV-4 broken, no
     * error, ever. {@code MembershipService} refuses the owner's departure two layers up, but that is
     * authority logic in a different module, and S1.6 is about to add a second caller of this row
     * write. So the row write refuses too, and it refuses loudly.
     */
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

    /**
     * The refusal above would be worthless if this row write refused everything — that is the shape of
     * a check whose two outcomes are indistinguishable, which this repo has been burned by three times.
     * A member's row deletes cleanly through the same call.
     */
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
        // Idempotent at this layer too: the second call finds nothing to destroy and says so — the
        // false that stops MembershipService emitting a second event for one departure.
        Boolean removedAgain = transactions.execute(tx -> workspaces.removeMember(itinerary.id(), memberId));
        assertThat(removedAgain).isFalse();
    }

    /** The same index must not stand in the way of many members — it is partial for this reason. */
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
