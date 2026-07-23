package com.largata.itinerary;

import com.largata.common.error.NotFoundException;

/**
 * A day id that does not name a day of the itinerary the caller was authorized for (S1.3).
 *
 * <p>404, and — like the guard's {@code ITINERARY_NOT_FOUND} — it masks: "no such day" and "a day of
 * some other plan" are one answer, so a member of trip A cannot probe for day ids of trip B by the
 * shape of the rejection. The guard has already proven standing on the itinerary; this guards the
 * day-belongs-to-this-itinerary step underneath it.
 */
class DayNotFoundException extends NotFoundException {

    DayNotFoundException() {
        super("DAY_NOT_FOUND", "No such day.");
    }
}
