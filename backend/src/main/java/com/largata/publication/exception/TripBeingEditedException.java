package com.largata.publication.exception;

import com.largata.common.error.ConflictException;

public final class TripBeingEditedException extends ConflictException {

    public TripBeingEditedException() {
        super("EDIT_LOCKED", "Somebody is editing this itinerary right now.");
    }
}
