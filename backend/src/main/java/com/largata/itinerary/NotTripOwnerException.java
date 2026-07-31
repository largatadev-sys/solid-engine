package com.largata.itinerary;

import com.largata.common.error.ForbiddenException;


class NotTripOwnerException extends ForbiddenException {

    NotTripOwnerException() {
        this("Only the trip owner can start or complete this trip.");
    }


    NotTripOwnerException(String message) {
        super("NOT_PERMITTED", message);
    }
}
