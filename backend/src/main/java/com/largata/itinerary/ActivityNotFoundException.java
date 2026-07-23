package com.largata.itinerary;

import com.largata.common.error.NotFoundException;

/**
 * An activity id that does not name an activity of a day of the itinerary the caller was authorized
 * for (S1.3).
 *
 * <p>404, and it masks like {@link DayNotFoundException} and the guard's {@code ITINERARY_NOT_FOUND}:
 * "no such activity" and "an activity of some other plan" are one answer, so a member of trip A cannot
 * probe for activity ids of trip B by the shape of the rejection. The guard has proven standing on the
 * itinerary; the day- and activity-belongs checks underneath it 404 the same way.
 */
class ActivityNotFoundException extends NotFoundException {

    ActivityNotFoundException() {
        super("ACTIVITY_NOT_FOUND", "No such activity.");
    }
}
