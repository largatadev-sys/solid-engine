package com.largata.itinerary;

import com.largata.common.error.ForbiddenException;


class NotTripOwnerException extends ForbiddenException {

    NotTripOwnerException() {
        super("NOT_PERMITTED", "Only the trip owner can start or complete this trip.");
    }
}
