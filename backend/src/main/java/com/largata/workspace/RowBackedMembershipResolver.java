package com.largata.workspace;

import com.largata.common.authz.Membership;
import com.largata.common.authz.MembershipResolver;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * S1.1's membership lookup: standing comes from a membership row, because membership rows now exist
 * (ADR-011).
 *
 * <p>This class is the swap the resolver seam was built for. S0.3's {@code OwnerMembershipResolver}
 * synthesized an {@code OWNER} membership from {@code itinerary.owner_id} — truthful while ownership
 * was all there was — and is deleted with this story. <strong>The guard, every controller and every
 * service signature are untouched by the change</strong>; the only evidence anything moved is that
 * S0.3's guard tests still pass without an edit. That was the seam's entire promise, and it is the
 * headline evidence for AC 3.
 *
 * <p><strong>There is deliberately no fallback to {@code owner_id}.</strong> The tempting version —
 * "no row? then check ownership" — would silently paper over a failed backfill, which is the class
 * of bug that survives for months because nothing ever complains. After V5 the membership row is the
 * truth; if one is missing, the owner is locked out loudly and the next session investigates a real
 * signal. One code path, in the Full-rigor zone (S1.1 spec §The resolver swap). The trade is
 * accepted with its mitigation named: a backfill bug presents as "owner 404s on their own
 * itinerary", so the story proves the backfill on the deployed rung (AC 6) rather than carrying
 * diagnostic branching here forever.
 *
 * <p><strong>What it cannot tell you, by design.</strong> Empty means "no standing" for every
 * reason — no such itinerary, no workspace (an invariant breach), or simply not a member. The three
 * are one answer. Distinguishing the last would mean asking the itinerary module, which would point
 * this module at that one and close the cycle ADR-011 exists to prevent — and it would leak
 * existence anyway, which Artifact 03's masking rule forbids. Fail closed, uniformly.
 */
@Component
class RowBackedMembershipResolver implements MembershipResolver {

    private final MembershipRepository memberships;

    RowBackedMembershipResolver(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    @Override
    public Optional<Membership> resolve(UUID travelerId, UUID itineraryId) {
        // One projection of one column — the guard needs an answer, not an aggregate. The Membership
        // it returns names the *itinerary*, not the workspace: that is the guard's vocabulary
        // (Membership's javadoc: "the workspace's key until the Workspace itself exists"), and it
        // keeps the workspace id — this module's private business — from leaking above the seam.
        return memberships
                .findRole(travelerId, itineraryId)
                .map(role -> new Membership(travelerId, itineraryId, role));
    }
}
