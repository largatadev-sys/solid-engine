package com.largata.trip.exception;

import com.largata.common.error.ValidationException;


public final class MalformedTripIdException extends ValidationException {

    public MalformedTripIdException() {
        super("MALFORMED_REQUEST", "That request could not be read.");
    }
}
