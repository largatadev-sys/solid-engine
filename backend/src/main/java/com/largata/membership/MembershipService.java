package com.largata.membership;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.EditLeaseService;
import com.largata.itinerary.ItineraryService;
import com.largata.membership.MembershipExceptions.CannotOfferToSelfException;
import com.largata.membership.MembershipExceptions.NoPendingOfferException;
import com.largata.membership.MembershipExceptions.NotOfferTargetException;
import com.largata.membership.MembershipExceptions.NotTripOwnerException;
import com.largata.membership.MembershipExceptions.OfferAlreadyPendingException;
import com.largata.membership.MembershipExceptions.OwnerCannotLeaveException;
import com.largata.membership.MembershipExceptions.TargetNotAMemberException;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The membership lifecycle after joining: departure now (S1.5), ownership transfer and the
 * owner-deletion claim next (S1.6).
 *
 * <p><strong>Why this module exists, since three others could plausibly have hosted it (ADR-002, P9).</strong>
 * Departure needs two modules in one transaction — the membership row from {@code workspace}, the edit
 * lease from {@code itinerary} — and it belongs to neither:
 *
 * <ul>
 *   <li>Not {@code workspace}: that module imports nothing at all, and {@code itinerary} already
 *       depends on it (for {@code formAround}). Reaching from there into {@code EditLeaseService} would
 *       close a package cycle — precisely what ADR-011's resolver seam was built to prevent.
 *   <li>Not {@code itinerary}: it can see both, but membership is not the plan's business. It
 *       orchestrates workspace <em>formation</em> only because that is atomic with creating an
 *       itinerary; nothing about removing a person is.
 *   <li>Not {@code invitation}: it also sits above both and owns the mirror act — {@code accept}
 *       orchestrates admission — but its trigger is an invitation. Departure's trigger is neither an
 *       invitation nor an itinerary act; it is a membership act with no other concept in it. A concern
 *       with no honest home is a missing module, and S1.6's transfer will want the same one.
 * </ul>
 *
 * <p><strong>A third thing called "membership", and the disambiguation is worth the paragraph</strong>
 * (the same one {@code workspace.Membership} writes for the same reason). {@link Membership} in {@code
 * common.authz} is a <em>capability</em> the guard mints. {@code workspace.Membership} is the <em>row</em>
 * that capability is read from. This module is the <em>lifecycle</em> — the acts that create and destroy
 * the relationship. One domain concept, three contexts, each name right where it stands.
 *
 * <p><strong>S1.6 gave it its first table</strong> — {@link OwnershipOffer}, the pending proposal that
 * makes ownership move by consent rather than decree. That does not change the module's character: the
 * membership <em>rows</em> still live in {@code workspace} and are still written only through {@link
 * WorkspaceService}, so this is not a second place membership facts live. It owns the offer because the
 * offer is a lifecycle artifact — it exists to schedule a change of role, and it dies when the role
 * relationship it points at ends.
 *
 * <p>Everything else it reaches by service interface (ADR-002), which is what keeps it a coordinator:
 * the membership row from {@code workspace}, the edit lease and the itinerary's denormalised owner from
 * {@code itinerary}.
 */
@Service
public class MembershipService {

    private static final Logger log = LoggerFactory.getLogger(MembershipService.class);

    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final EditLeaseService leases;
    private final OwnershipOfferRepository offers;
    private final OwnershipTransferRepository transfers;
    private final Analytics analytics;

    MembershipService(
            WorkspaceService workspaces,
            ItineraryService itineraries,
            EditLeaseService leases,
            OwnershipOfferRepository offers,
            OwnershipTransferRepository transfers,
            Analytics analytics) {
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.leases = leases;
        this.offers = offers;
        this.transfers = transfers;
        this.analytics = analytics;
    }

    /**
     * Ends a membership: the owner removing a member, or a member leaving (S1.5).
     *
     * <p><strong>One operation, two doors.</strong> Removal and leave differ only in whether the caller
     * is the target — so they are one code path, and the distinction survives exactly where it is
     * genuinely useful: the analytics event. Two service methods would have meant two authority ladders
     * to keep in agreement forever, for one act.
     *
     * <p><strong>The ladder, and its order is a decision, not an accident:</strong>
     *
     * <ol>
     *   <li><em>Authority before state.</em> A member targeting somebody else is 403 whether or not that
     *       somebody is still on the trip. Were the order reversed, the already-departed target would
     *       answer 204 to a caller with no right to ask — an authority answer that leaks roster state,
     *       and a rejection that changes shape as other people come and go.
     *   <li><em>INV-4 before existence.</em> The owner targeting themselves is a conflict naming the
     *       missing step (S1.6's transfer), never a deletion.
     *   <li><em>Then existence.</em> No row means the work is already done: return, and the endpoint
     *       answers 204 (Artifact 05 — deleting the deleted is still 204). Nothing leaks: the caller
     *       passed the guard and can read the roster anyway.
     * </ol>
     *
     * <p>The lease release and the row delete share this transaction by construction — both
     * collaborators declare {@code MANDATORY}, so neither can commit without the other.
     *
     * @param caller the guard-minted standing of whoever is asking — the only way in
     * @param targetTravelerId whose membership is to end; equal to the caller's own id for a leave
     * @throws NotTripOwnerException if a non-owner targets somebody else (403)
     * @throws OwnerCannotLeaveException if the target is the owner (409) — INV-4
     */
    @Transactional
    public void depart(Membership caller, UUID targetTravelerId) {
        UUID itineraryId = caller.itineraryId();
        boolean leaving = caller.travelerId().equals(targetTravelerId);

        if (!leaving && !caller.isOwner()) {
            throw new NotTripOwnerException();
        }
        if (leaving && caller.isOwner()) {
            throw new OwnerCannotLeaveException();
        }

        Optional<Role> targetRole = workspaces.roleOf(itineraryId, targetTravelerId);
        if (targetRole.isEmpty()) {
            return; // Already gone — idempotent 204.
        }
        if (targetRole.get() == Role.OWNER) {
            // Unreachable while INV-4 holds (one owner, and the self-target case is caught above), so
            // this is a guard against the invariant having been broken elsewhere rather than an
            // expected path. It fails as a conflict rather than deleting the last owner.
            throw new OwnerCannotLeaveException();
        }

        if (!workspaces.removeMember(itineraryId, targetTravelerId)) {
            // Lost a race with a concurrent departure of the same member. The outcome the caller asked
            // for holds, so this is still a 204 — but the row was destroyed by the other transaction,
            // which owns the lease release and the event. Emitting here would double-count one departure.
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
        // After commit: a departure that rolls back never happened, and the funnel must not count it.
        // (Contrast S1.4's edit_lock_denied, which fires immediately *because* its transaction rolls
        // back — a rejection's whole point is that nothing committed.)
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

    // --- Ownership offers (S1.6) ------------------------------------------------------------------

    /**
     * Offers ownership of the trip to one of its members (S1.6 §4). Owner-only.
     *
     * <p><strong>Why an offer and not a transfer.</strong> The grilling locked unilateral transfer and
     * the founder reversed it; the reasoning is on the record in {@link OwnershipOffer}'s javadoc.
     * Short version: this product has no notifications, and of the two unnoticed cases, an unnoticed
     * offer is a delay while an unnoticed imposition is INV-4's load-bearing role held by somebody who
     * does not know they hold it.
     *
     * <p><strong>The ladder, ordered as S1.5's departure ladder is</strong> — authority first, then
     * conflicts, so a rejection never changes shape as the roster changes around it:
     *
     * <ol>
     *   <li><em>Authority.</em> Not the owner → 403, whatever the target's state.
     *   <li><em>Self.</em> Offering to yourself is a conflict, not a no-op: this is a create endpoint,
     *       and a 201 for "you already own it" would leave the client unable to tell a real offer from
     *       a swallowed mistake.
     *   <li><em>Target is a member.</em> A non-member target is a conflict naming the remedy (invite
     *       them), not a 404 — nothing is being masked from an owner who can read their own roster.
     *   <li><em>One at a time.</em> A pending offer must be revoked explicitly before another is made.
     *       V9's partial unique index enforces the same rule underneath, so a request that races past
     *       this check dies on the constraint rather than producing a second live offer.
     * </ol>
     *
     * @param owner the guard-minted standing of whoever is asking
     * @param targetTravelerId the member being offered the crown
     */
    @Transactional
    public void offerOwnership(Membership owner, UUID targetTravelerId) {
        UUID itineraryId = owner.itineraryId();
        if (!owner.isOwner()) {
            throw new NotTripOwnerException();
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

    /**
     * Revokes the trip's pending ownership offer (S1.6 §4). Owner-only, and idempotent.
     *
     * <p><strong>No pending offer is a success, not a 404</strong> (Artifact 05: deleting the deleted is
     * still 204). The asked-for end state — no outstretched hand — already holds, and nothing leaks: the
     * caller is the owner and can read the roster. Contrast accept/decline, where the absence of an
     * offer is a genuine 404, because there the caller is asking to <em>act on</em> a thing rather than
     * to ensure its absence.
     */
    @Transactional
    public void revokeOwnershipOffer(Membership owner) {
        UUID itineraryId = owner.itineraryId();
        if (!owner.isOwner()) {
            throw new NotTripOwnerException();
        }
        Optional<OwnershipOffer> pending =
                offers.findByWorkspaceIdAndStatus(workspaceIdOf(itineraryId), OwnershipOfferStatus.PENDING);
        if (pending.isEmpty()) {
            return; // Already none — idempotent 204.
        }
        OwnershipOffer offer = pending.get();
        offer.revoke(Instant.now());
        offers.saveAndFlush(offer);
        log.info("Ownership offer revoked: itineraryId={} offerId={}", itineraryId, offer.id());
        emitAfterCommit("ownership_offer_revoked", itineraryId, offer.targetTravelerId(), owner.travelerId());
    }

    /**
     * Accepts the ownership offer made to the caller — the transfer itself (S1.6 §6).
     *
     * <p><strong>Four effects, one transaction, and the point is that they are inseparable:</strong>
     *
     * <ol>
     *   <li>the membership roles swap (demote-then-promote, conditional and count-checked inside {@link
     *       WorkspaceService#transferOwnership} — that is where INV-4 is defended under concurrency);
     *   <li>the itinerary's denormalised {@code ownerId} follows, so no column lies;
     *   <li>an {@link OwnershipTransfer} row records that this happened, permanently — the one artifact
     *       here with no reader today and the one that could never be reconstructed later;
     *   <li>the offer closes as {@code ACCEPTED}.
     * </ol>
     *
     * <p>Any of them committing without the others is a corruption of a different kind — a crown with no
     * record, a record with no crown, a column naming a stranger — so they share this transaction and
     * every collaborator declares {@code MANDATORY} to make that structural rather than remembered.
     *
     * <p><strong>The ex-owner stays a member.</strong> Transfer is a role swap, not an exit: leaving is
     * S1.5's separate act, which now works for them because they are no longer the owner. The two
     * operations compose with no code at the seam, which is why they are two operations.
     *
     * @param caller the guard-minted standing of the offeree
     */
    @Transactional
    public void acceptOwnershipOffer(Membership caller) {
        OwnershipOffer offer = requireOfferFor(caller);
        UUID itineraryId = caller.itineraryId();
        UUID newOwnerId = caller.travelerId();
        UUID formerOwnerId = offer.offeredBy();

        // The offer names who made it, but ownership may have moved since (the former owner could have
        // been offered it back and accepted). Read the current holder rather than trusting the offer's
        // record of who was owner when it was written.
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
            // Worth a line: the offer outlived the ownership it was made from. Harmless — the swap used
            // the current holder — but it means someone's screen was stale, and the log should say so
            // rather than leaving a puzzling transfer record.
            log.info(
                    "Ownership offer outlived its offeror: itineraryId={} offeredBy={} actualFrom={}",
                    itineraryId,
                    formerOwnerId,
                    currentOwnerId);
        }
        // One event for one act: accept IS the transfer, so there is no separate offer_accepted. Two
        // events would double-count one movement of the crown in every funnel that reads them.
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("ownership_transferred")
                                        .with("itineraryId", itineraryId)
                                        .with("fromTravelerId", currentOwnerId)
                                        .with("toTravelerId", newOwnerId)
                                        .build()));
    }

    /**
     * Declines the ownership offer made to the caller (S1.6 §4) — the crown stays where it is.
     *
     * <p>Uses {@link #requireOfferFor}, so the ladder is the shared one: no live offer → 404; an offer
     * that belongs to another member → 403, never a 404, because refusing must not depend on who the
     * offer happens to target.
     */
    @Transactional
    public void declineOwnershipOffer(Membership caller) {
        OwnershipOffer offer = requireOfferFor(caller);
        offer.decline(Instant.now());
        offers.saveAndFlush(offer);
        log.info("Ownership offer declined: itineraryId={} offerId={}", caller.itineraryId(), offer.id());
        emitAfterCommit(
                "ownership_offer_declined", caller.itineraryId(), caller.travelerId(), caller.travelerId());
    }

    /**
     * The traveler a live ownership offer is addressed to on this trip, if there is one (S1.6 §7) — the
     * roster's {@code ownershipOffered} flag, and the only offer state that reaches the wire.
     *
     * <p><strong>Readable by any member, deliberately.</strong> Who has been offered the crown is
     * governance state of a shared trip, workspace-walled like roles (INV-1) rather than private
     * between two people — and a group that can see the unaccepted crown can nudge, which is itself
     * part of the discovery guarantee the offer/accept design rests on.
     */
    @Transactional(readOnly = true)
    public Optional<UUID> pendingOfferTargetIn(UUID itineraryId) {
        return workspaces
                .workspaceIdOf(itineraryId)
                .flatMap(id -> offers.findByWorkspaceIdAndStatus(id, OwnershipOfferStatus.PENDING))
                .map(OwnershipOffer::targetTravelerId);
    }

    // --- internals --------------------------------------------------------------------------------

    /**
     * Loads the caller's own live offer or refuses — the shared gate for accept and decline.
     *
     * <p><strong>404 before 403, and the order is the decision.</strong> "No offer at all" and "an offer
     * that is not yours" are different answers because they are different situations: the first is an
     * absent resource, the second is a real one the caller has no claim on. Answering 403 for both would
     * tell a member that <em>some</em> offer exists whenever they guess — and answering 404 for both
     * would hide C's offer from B in a way that makes a stale client look broken rather than late.
     *
     * <p>This is also where the stale-accept race dies: B accepting after their offer was revoked and
     * C's issued finds C's pending row, is not its target, and is refused. No timing, no client refresh,
     * no lost update — the wrong accept is structurally impossible rather than merely unlikely.
     */
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

    /**
     * Dissolves a pending offer to a traveler who is leaving the trip (S1.6 §5), inside the departure's
     * transaction.
     *
     * <p><strong>Why the offer cannot simply be left standing.</strong> Its target could no longer
     * legally accept (they are not a member), the owner would see a live offer to a ghost, and — because
     * at most one offer may be pending per workspace — that dead offer would block offering to anybody
     * else. So it dies with the membership, and this runs in {@code depart}'s transaction: a departure
     * and its offer-void commit together or not at all.
     *
     * <p>{@link OwnershipOfferStatus#VOIDED} rather than {@code REVOKED} because the owner did not
     * retract it — the system dissolved it. The distinction is what keeps the analytics honest about who
     * acted, and it is why removal does not need to <em>refuse</em> while an offer stands: removing the
     * offeree obviously retracts the offer, and a 409 telling the owner to revoke first would be
     * ceremony with no protective value.
     */
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
                            offer.voidBecauseTargetDeparted(Instant.now());
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

    /**
     * Emits one offer-lifecycle event after commit — the four share a shape, so they share a method.
     *
     * <p>After commit for {@code depart}'s recorded reason: an act that rolls back never happened, and
     * the funnel must not count it. {@code byTravelerId} names the true initiator, which is the whole
     * point of {@code VOIDED} being its own status — a departure-driven void is attributed to whoever
     * drove the departure, never to the owner whose offer it was.
     */
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
