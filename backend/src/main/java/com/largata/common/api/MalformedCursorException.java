package com.largata.common.api;

import com.largata.common.error.ValidationException;


public class MalformedCursorException extends ValidationException {

    MalformedCursorException() {
        super("MALFORMED_CURSOR", "That cursor is not valid. Start from the first page.");
    }
}
