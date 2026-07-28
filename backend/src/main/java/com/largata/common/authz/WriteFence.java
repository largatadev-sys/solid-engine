package com.largata.common.authz;

import org.springframework.stereotype.Component;

/**
 * The archive write fence (S1.9): an archived trip refuses every act on itself.
 *
 * <p><strong>A sibling of {@link AuthorizationGuard}, deliberately not part of it</strong> (spec
 * decision 3). The guard answers <em>who you are</em>; this answers <em>what is allowed now</em>.
 * Folding the second question into the first would make the guard the place every future gate
 * accretes — and the guard is one of the two Full-rigor zones in CLAUDE.md, where "one thing, done
 * unbypassably" is the whole value. Its javadoc's "what is deliberately absent" list stays true.
 *
 * <p><strong>One implementation, called explicitly at every write.</strong> Rejected at the grilling:
 * a per-service {@code if} (Artifact 03's default-by-omission, the shape it refused for authorization)
 * and an AOP annotation (no precedent in this codebase, and S0.2's filter-ordering history is a
 * standing reminder that invisible interception here fails in ways that name nothing).
 *
 * <p><strong>The honest residual risk, and what covers it.</strong> A future write endpoint can still
 * forget to call this — no signature forces it, unlike the guard's {@link Membership} parameter. The
 * mitigation is {@code ArchiveWriteFenceIT}, which walks every mutating endpoint against an archived
 * trip and asserts refusal, with self-removal as its positive control. That test is the fence's real
 * guarantee; it fails the day someone adds an endpoint without this call.
 *
 * <p><strong>Order: always after the guard.</strong> A non-member must get the guard's 404, not a
 * {@code TRIP_ARCHIVED} that confirms the trip exists. Taking a resolved {@link Membership} rather than
 * a bare id is what makes that ordering structural — you cannot call this without having passed the
 * guard first.
 */
@Component
public class WriteFence {

    private final TripWritability writability;

    public WriteFence(TripWritability writability) {
        this.writability = writability;
    }

    /**
     * Refuses if the trip is archived.
     *
     * <p><strong>Acts on the trip freeze; acts on one's own membership do not</strong> (founder ruling,
     * spec decision 4) — so leaving a trip deliberately does not call this, while removing somebody
     * else does. The line is a rule rather than an exception: your relationship to a trip stays yours
     * even when the trip is frozen, and a member of an archived trip they cannot leave would be stuck
     * on somebody else's decision with no lever of their own.
     *
     * @param member the caller's standing, already resolved by the guard — which is what guarantees
     *     this check runs second and never masks a non-member's 404
     * @throws TripArchivedException if the trip's workspace is archived (409)
     */
    public void requireWritable(Membership member) {
        if (writability.isFrozen(member.itineraryId())) {
            throw new TripArchivedException();
        }
    }
}
