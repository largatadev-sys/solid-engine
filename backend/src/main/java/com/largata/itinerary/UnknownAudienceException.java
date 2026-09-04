package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class UnknownAudienceException extends ValidationException {

    UnknownAudienceException(String requested) {
        super(
                "UNKNOWN_AUDIENCE",
                "There is no audience \"" + requested + "\". Publish to \"public\".");
    }
}
