package com.largata.itinerary;

import com.largata.common.error.ConflictException;

/**
 * A lifecycle transition was asked for from a state that does not permit it (S1.7) — starting a trip
 * that is already active, completing one still in draft, completing one already complete.
 *
 * <p><strong>A 409, per the taxonomy's own words:</strong> {@link ConflictException}'s javadoc names
 * illegal state transitions as its case, and 05-api-conventions maps that category to 409. The
 * request is well-formed and the caller is authorized — the resource is simply not in a state where
 * the act means anything.
 *
 * <p><strong>One code for every illegal transition, and that is deliberate.</strong> The client's
 * response to any of them is identical: refetch the itinerary and re-render, because the screen was
 * showing a stale state. A per-transition code vocabulary ({@code ALREADY_ACTIVE}, {@code
 * NOT_YET_ACTIVE}, …) would be four codes serving one branch. The <em>message</em> names the actual
 * from→to so a human reading a log or a toast learns which transition was refused — the standing
 * envelope convention: clients branch on {@code code}, display {@code message} verbatim.
 *
 * <p>This is also the exception that keeps the machine strict. A trip whose travel is over but which
 * was never started reaches {@code completed} through {@code active}, in two deliberate acts (spec
 * decision 9): {@code complete} on a draft answers here rather than quietly inventing a skip edge and
 * two timestamps the owner never asked for.
 */
class IllegalStateTransitionException extends ConflictException {

    IllegalStateTransitionException(ItineraryState from, ItineraryState to) {
        super(
                "ILLEGAL_STATE_TRANSITION",
                "This trip is " + from.wireName() + " and cannot become " + to.wireName() + ".");
    }
}
