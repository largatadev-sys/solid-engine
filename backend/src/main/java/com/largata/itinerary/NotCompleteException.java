package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class NotCompleteException extends ConflictException {

    NotCompleteException(ItineraryState state) {
        super(
                "ITINERARY_NOT_COMPLETE",
                "Only a completed trip can be published. Mark this trip complete first. It is "
                        + state.wireName() + " right now.");
    }
}
