package com.largata.membership;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.EditLeaseService;
import com.largata.membership.MembershipExceptions.NotTripOwnerException;
import com.largata.membership.MembershipExceptions.OwnerCannotLeaveException;
import com.largata.workspace.WorkspaceService;
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
 * <p>No repository and no entity: this module owns no tables. It reaches both collaborators by service
 * interface (ADR-002), which is what keeps it a coordinator rather than a fourth place membership
 * facts live.
 */
@Service
public class MembershipService {

    private static final Logger log = LoggerFactory.getLogger(MembershipService.class);

    private final WorkspaceService workspaces;
    private final EditLeaseService leases;
    private final Analytics analytics;

    MembershipService(WorkspaceService workspaces, EditLeaseService leases, Analytics analytics) {
        this.workspaces = workspaces;
        this.leases = leases;
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
}
