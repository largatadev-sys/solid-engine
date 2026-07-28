package com.largata.itinerary;

import com.largata.common.error.ForbiddenException;

/**
 * A member who is not the owner tried a lifecycle transition (S1.7) — 403.
 *
 * <p><strong>Distinct from the guard's 404:</strong> this caller <em>is</em> on the trip, so nothing
 * is being masked from them; they simply lack the role. Members shape the plan — days, activities,
 * fields (S1.3, spec Q8) — while lifecycle, membership and existence stay the owner's. This is that
 * line, drawn inside the module that owns the state machine.
 *
 * <p><strong>{@code NOT_PERMITTED}, the third module to carry it, deliberately.</strong> The
 * invitation and membership modules each declare their own owner-only rejection with this same code,
 * and each records why: from the client's side "you are a member but this is the owner's to do" is one
 * situation, and a second code for it would mean two branches for one meaning. The duplicated string
 * across three modules is the price of each module owning its own rejections rather than reaching into
 * a sibling's package-private class (ADR-002) or growing a shared exception grab-bag — and the codes
 * are Artifact 05's vocabulary, not any one module's property.
 *
 * <p><strong>The S1.7 spec calls this code {@code NOT_TRIP_OWNER}; that prose is wrong and the spec's
 * {@code ## Comments} records the correction.</strong> The phrase describes the *situation* — and names
 * this class — but no such code has ever been on the wire: S1.6's spec said it too and shipped {@code
 * NOT_PERMITTED} for the reasoning above. Under ADR-008 the shipped code is permanent, so this is
 * written down here rather than left for the next reader to rediscover as a contradiction.
 */
class NotTripOwnerException extends ForbiddenException {

    NotTripOwnerException() {
        super("NOT_PERMITTED", "Only the trip owner can start or complete this trip.");
    }
}
