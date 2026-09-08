package com.largata.trip.trip;

import com.largata.common.error.ForbiddenException;


public class NotTripOwnerException extends ForbiddenException {

    public NotTripOwnerException() {
        this("Only the trip owner can start or complete this trip.");
    }


    public NotTripOwnerException(String message) {
        super("NOT_PERMITTED", message);
    }
}
