package com.largata.common.authz;

import java.util.Optional;
import java.util.UUID;

/**
 * The one thing about the guard that is <em>known</em> to change: how standing is looked up
 * (ADR-011).
 *
 * <p>The guard's contract — {@code requireMember(traveler, itinerary) → Membership} — is permanent
 * and every call site couples to it. The lookup behind it is not: S0.3 answers from itinerary
 * ownership ({@code owner_id} match), and S1.1 answers from real membership rows joined through the
 * Workspace. This interface is the line between them, and it points the dependency the right way:
 * {@code common} stays at the bottom of the module graph and modules plug into it, rather than
 * {@code common} reaching up into whichever module currently owns the data.
 *
 * <p>Seams for <em>scheduled</em> change are cheap; seams for imagined change are waste. This one is
 * scheduled: S1.1 is on the board, and when it lands, the swap is one class and a Spring binding —
 * the guard, the controllers and every service signature stay untouched.
 */
public interface MembershipResolver {

    /**
     * Resolves the traveler's standing on the itinerary, or empty if they have none.
     *
     * <p>Empty must mean "no standing" for <em>every</em> reason — the itinerary does not exist, or
     * exists and is not theirs. Implementations must not distinguish the two, and the guard could
     * not honour the distinction anyway: Artifact 03 requires both to answer 404, so that a probe
     * cannot learn an id is real by the shape of its rejection.
     */
    Optional<Membership> resolve(UUID travelerId, UUID itineraryId);
}
