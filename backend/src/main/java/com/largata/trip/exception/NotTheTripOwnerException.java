package com.largata.trip.exception;

import com.largata.common.error.ForbiddenException;

public final class NotTheTripOwnerException extends ForbiddenException {

    public NotTheTripOwnerException(String message) {
        super("NOT_PERMITTED", message);
    }
}
