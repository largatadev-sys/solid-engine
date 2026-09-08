package com.largata.trip.trip;

import com.largata.common.error.ConflictException;
import com.largata.trip.api.TripLifecycle;


public class NotCompleteException extends ConflictException {

    NotCompleteException(TripLifecycle state) {
        super(
                "ITINERARY_NOT_COMPLETE",
                "Only a completed trip can be published. Mark this trip complete first. It is "
                        + state.wireName() + " right now.");
    }
}
