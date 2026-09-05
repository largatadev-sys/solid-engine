package com.largata.publication;

import com.largata.common.error.ConflictException;
import com.largata.common.error.NotFoundException;
import com.largata.trip.TripLifecycle;


public final class PublicationExceptions {

    private PublicationExceptions() {}


    public static final class PublicationNotFoundException extends NotFoundException {

        public PublicationNotFoundException() {
            super("PUBLICATION_NOT_FOUND", "No such published itinerary.");
        }
    }


    public static final class TripNotCompleteException extends ConflictException {

        public TripNotCompleteException(TripLifecycle lifecycle) {
            super(
                    "ITINERARY_NOT_COMPLETE",
                    "Only a completed trip can be published. Mark this trip complete first. It is "
                            + lifecycle.wireName() + " right now.");
        }
    }
}
