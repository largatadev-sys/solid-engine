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


@SpringBootTest
class OwnershipOfferStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private MembershipService memberships;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;


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


    private UUID newTrip(UUID ownerId) {
        Itinerary itinerary = itineraries.create(ownerId, "Kanazawa", List.of("Kanazawa"), null, null);
        return itinerary.id();
    }


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
