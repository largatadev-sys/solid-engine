package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The contract between {@link OwnershipOfferStatus} and the {@code ownership_offer.status} column —
 * pinned for the reason {@code MembershipStorageIT} pins {@code Role}: <strong>V9's one-pending
 * enforcement silently depends on the spelling.</strong>
 *
 * <p>{@code ownership_offer_one_pending_idx} is a partial unique index with the predicate {@code WHERE
 * status = 'PENDING'}. If the stored spelling ever moved — an {@code AttributeConverter}, a tidied-away
 * {@code @Enumerated}, a lower-casing to match some wire form — that predicate would match nothing. The
 * index would still be created, still cost nothing, and enforce <em>nothing</em>: two live offers on
 * one trip, two people able to accept, INV-4 defended only by an application-level {@code if}. No error,
 * and no other test in this suite would notice.
 *
 * <p>This exact near-miss shipped as a bug once already (S1.1's {@code WHERE role = 'owner'}), which is
 * why every partial index in this schema now gets a test whose failure names the cause.
 */
@SpringBootTest
class OwnershipOfferStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private MembershipService memberships;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;

    /**
     * {@code admitMember} is {@code Propagation.MANDATORY} — uncallable without a caller's transaction,
     * by design — so the fixture supplies one rather than the class being {@code @Transactional}, which
     * would roll everything back and hide whether the writes reached the database at all.
     */
    @Autowired private TransactionTemplate transactions;

    @Test
    void theStatusColumnHoldsTheEnumsName() {
        UUID ownerId = UUID.randomUUID();
        UUID memberId = admittedMemberOn(newTrip(ownerId), ownerId);
        UUID itineraryId = itineraryOf(memberId);
        memberships.offerOwnership(ownerMembership(itineraryId, ownerId), memberId);

        String stored =
                jdbc.queryForObject(
                        "SELECT o.status FROM ownership_offer o JOIN workspace w ON o.workspace_id = w.id "
                                + "WHERE w.itinerary_id = ?",
                        String.class,
                        itineraryId);

        assertThat(stored)
                .as("V9's partial unique index tests status = 'PENDING'; this is that value")
                .isEqualTo(OwnershipOfferStatus.PENDING.name())
                .isEqualTo("PENDING");
    }

    /**
     * The one-pending rule as a database guarantee rather than a service check.
     *
     * <p>The service refuses a second offer with {@code OFFER_ALREADY_PENDING}, and that is the
     * readable answer — but a race that slips between its read and its write must still not produce two
     * live offers, because two live offers means two people who can each take the crown. This asserts
     * the constraint underneath, by writing straight past the service.
     */
    @Test
    void aTripCannotHaveTwoPendingOffers() {
        UUID ownerId = UUID.randomUUID();
        UUID itineraryId = newTrip(ownerId);
        UUID firstTarget = admittedMemberOn(itineraryId, ownerId);
        UUID secondTarget = admittedMemberOn(itineraryId, ownerId);
        UUID workspaceId = workspaceOf(itineraryId);
        insertPendingOffer(workspaceId, firstTarget, ownerId);

        assertThatThrownBy(() -> insertPendingOffer(workspaceId, secondTarget, ownerId))
                .as("V9's ownership_offer_one_pending_idx must refuse the second live offer")
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * ...and the partial half of that index: terminal rows must not collide, or a trip could only ever
     * have one offer in its entire history — declining once would permanently foreclose the feature.
     */
    @Test
    void terminalOffersDoNotCollide() {
        UUID ownerId = UUID.randomUUID();
        UUID itineraryId = newTrip(ownerId);
        UUID target = admittedMemberOn(itineraryId, ownerId);
        UUID workspaceId = workspaceOf(itineraryId);

        insertOffer(workspaceId, target, ownerId, "DECLINED");
        insertOffer(workspaceId, target, ownerId, "REVOKED");
        insertOffer(workspaceId, target, ownerId, "VOIDED");
        insertOffer(workspaceId, target, ownerId, "ACCEPTED");
        insertPendingOffer(workspaceId, target, ownerId);

        Integer live =
                jdbc.queryForObject(
                        "SELECT count(*) FROM ownership_offer WHERE workspace_id = ? AND status = 'PENDING'",
                        Integer.class,
                        workspaceId);
        assertThat(live).as("four terminal rows plus exactly one live offer").isEqualTo(1);
    }

    // --- fixtures -----------------------------------------------------------------------------------

    private UUID newTrip(UUID ownerId) {
        Itinerary itinerary = itineraries.create(ownerId, "Kanazawa", List.of("Kanazawa"), null, null);
        return itinerary.id();
    }

    /**
     * A member planted directly, not through the invite flow: this class tests storage constraints, and
     * the HTTP round trip is {@code OwnershipOfferContractIT}'s job. The row still goes in through the
     * service that owns the table (never raw SQL for membership), so the fixture cannot drift from how
     * members are really written.
     */
    private UUID admittedMemberOn(UUID itineraryId, UUID ownerId) {
        UUID memberId = UUID.randomUUID();
        transactions.executeWithoutResult(
                status -> workspaces.admitMember(itineraryId, memberId, Instant.now()));
        return memberId;
    }

    private UUID itineraryOf(UUID memberTravelerId) {
        return jdbc.queryForObject(
                "SELECT w.itinerary_id FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                        + "WHERE m.traveler_id = ?",
                UUID.class,
                memberTravelerId);
    }

    private UUID workspaceOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itineraryId);
    }

    private void insertPendingOffer(UUID workspaceId, UUID targetId, UUID ownerId) {
        insertOffer(workspaceId, targetId, ownerId, "PENDING");
    }

    private void insertOffer(UUID workspaceId, UUID targetId, UUID ownerId, String status) {
        jdbc.update(
                "INSERT INTO ownership_offer (id, workspace_id, target_traveler_id, status, offered_by, "
                        + "offered_at) VALUES (?, ?, ?, ?, ?, now())",
                UUID.randomUUID(),
                workspaceId,
                targetId,
                status,
                ownerId);
    }

    private static Membership ownerMembership(UUID itineraryId, UUID ownerId) {
        return new Membership(ownerId, itineraryId, Role.OWNER);
    }
}
