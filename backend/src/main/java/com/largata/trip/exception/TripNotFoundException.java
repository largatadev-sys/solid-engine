package com.largata.trip.exception;

import com.largata.common.error.NotFoundException;

public final class TripNotFoundException extends NotFoundException {

    public TripNotFoundException() {
        super("TRIP_NOT_FOUND", "No such trip.");
    }
}
