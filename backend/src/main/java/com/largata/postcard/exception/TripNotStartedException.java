package com.largata.postcard.exception;

import com.largata.common.error.ValidationException;

public final class TripNotStartedException extends ValidationException {

    public TripNotStartedException() {
        super("TRIP_NOT_STARTED", "You can post a postcard once the trip has started.");
    }
}
