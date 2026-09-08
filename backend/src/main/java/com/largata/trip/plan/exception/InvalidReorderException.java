package com.largata.trip.plan.exception;

import com.largata.common.error.ValidationException;


public class InvalidReorderException extends ValidationException {

    public InvalidReorderException(String message) {
        super("INVALID_REORDER", message);
    }
}
