package com.largata.trip.plan;

import com.largata.common.error.ValidationException;


class InvalidReorderException extends ValidationException {

    InvalidReorderException(String message) {
        super("INVALID_REORDER", message);
    }
}
