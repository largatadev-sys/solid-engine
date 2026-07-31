package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class DayHasLeasedActivityException extends ConflictException {

    DayHasLeasedActivityException(LeaseHolder holder) {
        super(
                "DAY_HAS_LEASED_ACTIVITY",
                label(holder) + " is editing an activity in this day right now.");
    }


    private static String label(LeaseHolder holder) {
        if (holder.handle() != null && !holder.handle().isBlank()) {
            return "@" + holder.handle();
        }
        if (holder.displayName() != null && !holder.displayName().isBlank()) {
            return holder.displayName();
        }
        return "Another member";
    }
}
