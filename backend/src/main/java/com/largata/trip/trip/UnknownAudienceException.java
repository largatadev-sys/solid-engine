package com.largata.trip.trip;

import com.largata.common.error.ValidationException;


public class UnknownAudienceException extends ValidationException {

    UnknownAudienceException(String requested) {
        super(
                "UNKNOWN_AUDIENCE",
                "There is no audience \"" + requested + "\". Publish to \"public\".");
    }
}
