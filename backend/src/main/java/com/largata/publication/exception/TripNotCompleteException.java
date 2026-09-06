package com.largata.publication.exception;

import com.largata.common.error.ConflictException;
import com.largata.trip.api.TripLifecycle;

public final class TripNotCompleteException extends ConflictException {

    public TripNotCompleteException(TripLifecycle lifecycle) {
        super(
                "ITINERARY_NOT_COMPLETE",
                "Only a completed trip can be published. Mark this trip complete first. It is "
                        + lifecycle.wireName() + " right now.");
    }
}
