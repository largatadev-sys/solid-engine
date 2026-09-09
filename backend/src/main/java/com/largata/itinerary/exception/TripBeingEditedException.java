package com.largata.itinerary.exception;

import com.largata.common.error.ConflictException;

public final class TripBeingEditedException extends ConflictException {

    public TripBeingEditedException(String holderLabel) {
        super("EDIT_LOCKED", holderLabel + " is editing this itinerary right now.");
    }
}
