package com.largata.trip;

import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


public final class TripExceptions {

    private TripExceptions() {}


    public static final class TripNotFoundException extends NotFoundException {

        public TripNotFoundException() {
            super("TRIP_NOT_FOUND", "No such trip.");
        }
    }


    public static final class NotTheTripOwnerException extends ForbiddenException {

        public NotTheTripOwnerException(String message) {
            super("NOT_PERMITTED", message);
        }
    }
}
