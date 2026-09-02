package com.largata.itinerary.api;

import com.largata.common.error.ValidationException;


class InvalidPinException extends ValidationException {

    InvalidPinException(String message) {
        super("INVALID_PIN", message);
    }
}
