package com.largata.trip.record;

import com.largata.common.error.ValidationException;


public class VisibilityRetiredException extends ValidationException {

    VisibilityRetiredException() {
        super(
                "VISIBILITY_RETIRED",
                "A trip is either published or it is not. Publishing to a private audience is no longer"
                        + " offered; your profile decides who sees what you share.");
    }
}
