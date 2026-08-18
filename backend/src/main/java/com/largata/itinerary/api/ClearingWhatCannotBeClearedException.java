package com.largata.itinerary.api;

import com.largata.common.error.ValidationException;


class ClearingWhatCannotBeClearedException extends ValidationException {

    ClearingWhatCannotBeClearedException(String message) {
        super("VALIDATION_FAILED", message);
    }
}
