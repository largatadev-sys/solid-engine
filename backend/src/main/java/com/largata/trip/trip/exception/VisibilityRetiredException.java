package com.largata.trip.trip.exception;

import com.largata.common.error.ValidationException;


public class VisibilityRetiredException extends ValidationException {

    public VisibilityRetiredException() {
        super(
                "VISIBILITY_RETIRED",
                "A trip is either published or it is not. Publishing to a private audience is no longer"
                        + " offered; your profile decides who sees what you share.");
    }
}
