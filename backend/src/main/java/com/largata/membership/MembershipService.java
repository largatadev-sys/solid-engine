package com.largata.membership;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.EditLeaseService;
import com.largata.itinerary.ItineraryService;
import com.largata.invitation.InvitationService;
import com.largata.membership.MembershipExceptions.CannotOfferToSelfException;
import com.largata.membership.MembershipExceptions.IllegalWorkspaceTransitionException;
import com.largata.membership.MembershipExceptions.NoPendingOfferException;
import com.largata.membership.MembershipExceptions.NotOfferTargetException;
import com.largata.membership.MembershipExceptions.NotTripOwnerException;
import com.largata.membership.MembershipExceptions.OfferAlreadyPendingException;
import com.largata.membership.MembershipExceptions.OwnerCannotLeaveException;
import com.largata.membership.MembershipExceptions.TargetNotAMemberException;
import com.largata.workspace.WorkspaceService;
import com.largata.workspace.WorkspaceState;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class MembershipService {

    private static final Logger log = LoggerFactory.getLogger(MembershipService.class);

    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final EditLeaseService leases;
    private final InvitationService invitations;
    private final WriteFence fence;
    private final OwnershipOfferRepository offers;
    private final OwnershipTransferRepository transfers;
    private final Analytics analytics;

    MembershipService(
            WorkspaceService workspaces,
            ItineraryService itineraries,
            EditLeaseService leases,
            InvitationService invitations,
            WriteFence fence,
            OwnershipOfferRepository offers,
            OwnershipTransferRepository transfers,
            Analytics analytics) {
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.leases = leases;
        this.invitations = invitations;
        this.fence = fence;
        this.offers = offers;
        this.transfers = transfers;
        this.analytics = analytics;
    }


    @Transactional
    public void depart(Membership caller, UUID targetTravelerId) {
        UUID itineraryId = caller.itineraryId();
        boolean leaving = caller.travelerId().equals(targetTravelerId);

        if (!leaving) {
            fence.requireWritable(caller);
            if (!caller.isOwner()) {
                throw NotTripOwnerException.toRemoveAMember();
            }
        }
        if (leaving && caller.isOwner()) {
            throw new OwnerCannotLeaveException();
        }

        Optional<Role> targetRole = workspaces.roleOf(itineraryId, targetTravelerId);
        if (targetRole.isEmpty()) {
            return;
        }
        if (targetRole.get() == Role.OWNER) {
            throw new OwnerCannotLeaveException();
        }

        if (!workspaces.removeMember(itineraryId, targetTravelerId)) {
            return;
        }
        leases.releaseHeldBy(itineraryId, targetTravelerId);
        voidPendingOfferTo(itineraryId, targetTravelerId, caller.travelerId());

        log.info(
                "Membership ended: itineraryId={} travelerId={} by={} leaving={}",
                itineraryId,
                targetTravelerId,
                caller.travelerId(),
                leaving);
        String event = leaving ? "member_left" : "member_removed";
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", targetTravelerId)
                                        .with("byTravelerId", caller.travelerId())
                                        .build()));
    }


    @Transactional
    public void archive(Membership owner) {
        UUID itineraryId = requireOwnerToChangeArchiveState(owner);
        if (currentState(itineraryId).isArchived()) {
            throw IllegalWorkspaceTransitionException.alreadyArchived();
        }

        workspaces.archive(itineraryId);
        leases.releaseAnyHold(itineraryId);
        invitations.voidPendingInvitations(workspaceIdOf(itineraryId));
        voidAnyPendingOffer(itineraryId, owner.travelerId());

        log.info("Trip archived: itineraryId={} by={}", itineraryId, owner.travelerId());
        emitArchiveEvent("itinerary_archived", itineraryId, owner.travelerId());
    }


    @Transactional
    public void unarchive(Membership owner) {
        UUID itineraryId = requireOwnerToChangeArchiveState(owner);
        if (!currentState(itineraryId).isArchived()) {
            throw IllegalWorkspaceTransitionException.notArchived();
        }

        workspaces.unarchive(itineraryId, itineraries.isCompleted(itineraryId));

        log.info("Trip unarchived: itineraryId={} by={}", itineraryId, owner.travelerId());
        emitArchiveEvent("itinerary_unarchived", itineraryId, owner.travelerId());
    }


    private UUID requireOwnerToChangeArchiveState(Membership caller) {
        if (!caller.isOwner()) {
            throw NotTripOwnerException.toChangeArchiveState();
        }
        return caller.itineraryId();
    }

    private WorkspaceState currentState(UUID itineraryId) {
        return workspaces
                .stateOf(itineraryId)
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary with no workspace — invariant breach"));
    }


    private void voidAnyPendingOffer(UUID itineraryId, UUID byTravelerId) {
        offers
                .findByWorkspaceIdAndStatus(workspaceIdOf(itineraryId), OwnershipOfferStatus.PENDING)
                .ifPresent(
                        offer -> {
                            offer.voidBySystem(Instant.now());
                            offers.saveAndFlush(offer);
                            log.info(
                                    "Ownership offer voided by archive: itineraryId={} offerId={}",
                                    itineraryId,
                                    offer.id());
                            emitAfterCommit(
                                    "ownership_offer_voided", itineraryId, offer.targetTravelerId(), byTravelerId);
                        });
    }


    private void emitArchiveEvent(String event, UUID itineraryId, UUID byTravelerId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", byTravelerId)
                                        .build()));
    }



    @Transactional
    public void offerOwnership(Membership owner, UUID targetTravelerId) {
        UUID itineraryId = owner.itineraryId();
        fence.requireWritable(owner);
        if (!owner.isOwner()) {
            throw NotTripOwnerException.toOfferOwnership();
        }
        if (owner.travelerId().equals(targetTravelerId)) {
            throw new CannotOfferToSelfException();
        }
        if (workspaces.roleOf(itineraryId, targetTravelerId).isEmpty()) {
            throw new TargetNotAMemberException();
        }
        UUID workspaceId = workspaceIdOf(itineraryId);
        if (offers.findByWorkspaceIdAndStatus(workspaceId, OwnershipOfferStatus.PENDING).isPresent()) {
            throw new OfferAlreadyPendingException();
        }

        OwnershipOffer offer =
                offers.save(
                        OwnershipOffer.open(workspaceId, targetTravelerId, owner.travelerId(), Instant.now()));
        log.info(
                "Ownership offered: itineraryId={} offerId={} to={} by={}",
                itineraryId,
                offer.id(),
                targetTravelerId,
                owner.travelerId());
        emitAfterCommit("ownership_offer_created", itineraryId, targetTravelerId, owner.travelerId());
    }


    @Transactional
    public void revokeOwnershipOffer(Membership owner) {
        UUID itineraryId = owner.itineraryId();
        fence.requireWritable(owner);
        if (!owner.isOwner()) {
            throw NotTripOwnerException.toRevokeAnOffer();
        }
        Optional<OwnershipOffer> pending =
                offers.findByWorkspaceIdAndStatus(workspaceIdOf(itineraryId), OwnershipOfferStatus.PENDING);
        if (pending.isEmpty()) {
            return;
        }
        OwnershipOffer offer = pending.get();
        offer.revoke(Instant.now());
        offers.saveAndFlush(offer);
        log.info("Ownership offer revoked: itineraryId={} offerId={}", itineraryId, offer.id());
        emitAfterCommit("ownership_offer_revoked", itineraryId, offer.targetTravelerId(), owner.travelerId());
    }


    @Transactional
    public void acceptOwnershipOffer(Membership caller) {
        OwnershipOffer offer = requireOfferFor(caller);
        UUID itineraryId = caller.itineraryId();
        UUID newOwnerId = caller.travelerId();
        UUID formerOwnerId = offer.offeredBy();

        UUID currentOwnerId = workspaces.ownerOf(itineraryId).orElseThrow(
                () -> new IllegalStateException("No owner for itinerary " + itineraryId + " — INV-4 breach"));
        Instant now = Instant.now();

        workspaces.transferOwnership(itineraryId, currentOwnerId, newOwnerId);
        itineraries.reassignOwner(itineraryId, newOwnerId);
        transfers.save(OwnershipTransfer.record(offer.workspaceId(), currentOwnerId, newOwnerId, now));
        offer.accept(now);
        offers.saveAndFlush(offer);

        log.info(
                "Ownership accepted: itineraryId={} offerId={} from={} to={}",
                itineraryId,
                offer.id(),
                currentOwnerId,
                newOwnerId);
        if (!currentOwnerId.equals(formerOwnerId)) {
            log.info(
                    "Ownership offer outlived its offeror: itineraryId={} offeredBy={} actualFrom={}",
                    itineraryId,
                    formerOwnerId,
                    currentOwnerId);
        }
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("ownership_transferred")
                                        .with("itineraryId", itineraryId)
                                        .with("fromTravelerId", currentOwnerId)
                                        .with("toTravelerId", newOwnerId)
                                        .build()));
    }


    @Transactional
    public void declineOwnershipOffer(Membership caller) {
        OwnershipOffer offer = requireOfferFor(caller);
        offer.decline(Instant.now());
        offers.saveAndFlush(offer);
        log.info("Ownership offer declined: itineraryId={} offerId={}", caller.itineraryId(), offer.id());
        emitAfterCommit(
                "ownership_offer_declined", caller.itineraryId(), caller.travelerId(), caller.travelerId());
    }


    @Transactional(readOnly = true)
    public Optional<UUID> pendingOfferTargetIn(Membership caller) {
        return workspaces
                .workspaceIdOf(caller.itineraryId())
                .flatMap(id -> offers.findByWorkspaceIdAndStatus(id, OwnershipOfferStatus.PENDING))
                .map(OwnershipOffer::targetTravelerId);
    }



    private OwnershipOffer requireOfferFor(Membership caller) {
        OwnershipOffer offer =
                offers
                        .findByWorkspaceIdAndStatus(
                                workspaceIdOf(caller.itineraryId()), OwnershipOfferStatus.PENDING)
                        .orElseThrow(NoPendingOfferException::new);
        if (!offer.targetTravelerId().equals(caller.travelerId())) {
            throw new NotOfferTargetException();
        }
        return offer;
    }


    private void voidPendingOfferTo(UUID itineraryId, UUID departingTravelerId, UUID byTravelerId) {
        Optional<UUID> workspaceId = workspaces.workspaceIdOf(itineraryId);
        if (workspaceId.isEmpty()) {
            return;
        }
        offers
                .findByWorkspaceIdAndTargetTravelerIdAndStatus(
                        workspaceId.get(), departingTravelerId, OwnershipOfferStatus.PENDING)
                .ifPresent(
                        offer -> {
                            offer.voidBySystem(Instant.now());
                            offers.saveAndFlush(offer);
                            log.info(
                                    "Ownership offer voided by departure: itineraryId={} offerId={} target={}",
                                    itineraryId,
                                    offer.id(),
                                    departingTravelerId);
                            emitAfterCommit(
                                    "ownership_offer_voided", itineraryId, departingTravelerId, byTravelerId);
                        });
    }

    private UUID workspaceIdOf(UUID itineraryId) {
        return workspaces
                .workspaceIdOf(itineraryId)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "No workspace for itinerary " + itineraryId + " — invariant breach"));
    }


    private void emitAfterCommit(String event, UUID itineraryId, UUID targetTravelerId, UUID byTravelerId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", targetTravelerId)
                                        .with("byTravelerId", byTravelerId)
                                        .build()));
    }
}
