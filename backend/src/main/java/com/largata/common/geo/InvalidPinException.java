package com.largata.common.geo;

import com.largata.common.error.ValidationException;


public class InvalidPinException extends ValidationException {

    public InvalidPinException(String message) {
        super("INVALID_PIN", message);
    }
}
