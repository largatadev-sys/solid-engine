package com.largata.common.authz;

import com.largata.common.error.ConflictException;


public class TripArchivedException extends ConflictException {

    public TripArchivedException() {
        super("TRIP_ARCHIVED", "This trip is archived. Unarchive it to make changes.");
    }
}
