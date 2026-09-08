package com.largata.trip.validation;

import com.largata.common.error.ValidationException;


public class ClearingWhatCannotBeClearedException extends ValidationException {

    public ClearingWhatCannotBeClearedException(String message) {
        super("VALIDATION_FAILED", message);
    }
}
