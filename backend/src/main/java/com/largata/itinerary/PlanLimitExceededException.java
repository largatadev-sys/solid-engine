package com.largata.itinerary;

import com.largata.common.error.ValidationException;

/**
 * A plan cap a real client can hit: too many days on an itinerary, or too many activities on a day
 * (S1.3).
 *
 * <p><strong>A {@link ValidationException} (400), not a raw {@code IllegalArgumentException}</strong>
 * — for the reason {@link InvalidReorderException} states and this class exists to apply
 * consistently. There is no {@code IllegalArgumentException} mapping in the global handler, so a bare
 * one becomes a <em>500 logged at ERROR</em>: the operator is paged and the traveler is told
 * "something went wrong" for what is really "that is as many days as a trip can have".
 *
 * <p>Caught by the whole-branch review as cross-ticket drift: ticket 03 reasoned this out correctly
 * for the reorder, while tickets 01 and 02 left their append/create caps throwing the raw exception.
 * The rule was written down in one place and not applied in its siblings — the failure mode being
 * that a javadoc asserting a rule is not the same as the rule holding.
 *
 * <p>Distinct from the {@code seedDays} guards, which stay {@code IllegalArgumentException}: those
 * are unreachable behind the DTO's {@code @Max}/{@code @PositiveOrZero} and so are genuinely
 * programmer error, where a 500 is the honest answer.
 */
class PlanLimitExceededException extends ValidationException {

    PlanLimitExceededException(String message) {
        super("PLAN_LIMIT_EXCEEDED", message);
    }
}
