package com.largata.itinerary;

import com.largata.common.error.ValidationException;

/**
 * A reorder whose id list is not exactly the day's activities (S1.3, ticket 03) — missing one, listing
 * an extra or foreign one, or repeating one.
 *
 * <p><strong>A 400 the user can actually hit, so it is a {@link ValidationException}, not a raw {@code
 * IllegalArgumentException}.</strong> The set-equality rule cannot live in Bean Validation — it needs
 * the day's current activities, which the DTO cannot see — so unlike the activity-field format rules
 * (guarded by {@code @Pattern} at the DTO door), this check runs in the service against a real client
 * request. A stale client (its list one activity behind a concurrent add) is a normal race, not a
 * programming error, and it deserves a clean 400 rather than the 500 a bare {@code
 * IllegalArgumentException} would become through the global handler.
 */
class InvalidReorderException extends ValidationException {

    InvalidReorderException(String message) {
        super("INVALID_REORDER", message);
    }
}
