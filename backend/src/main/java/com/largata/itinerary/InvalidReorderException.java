package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class InvalidReorderException extends ValidationException {

    InvalidReorderException(String message) {
        super("INVALID_REORDER", message);
    }
}
