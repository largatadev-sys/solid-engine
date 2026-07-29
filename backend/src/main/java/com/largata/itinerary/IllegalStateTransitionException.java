package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class IllegalStateTransitionException extends ConflictException {

    IllegalStateTransitionException(ItineraryState from, ItineraryState to) {
        super(
                "ILLEGAL_STATE_TRANSITION",
                "This trip is " + from.wireName() + " and cannot become " + to.wireName() + ".");
    }
}
