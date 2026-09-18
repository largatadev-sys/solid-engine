package com.largata.trip.exception;

import com.largata.common.error.ConflictException;


public class TripArchivedException extends ConflictException {

    public TripArchivedException() {
        super("TRIP_ARCHIVED", "This trip is archived and is read-only.");
    }
}
