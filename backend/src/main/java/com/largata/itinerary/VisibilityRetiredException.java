package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class VisibilityRetiredException extends ValidationException {

    VisibilityRetiredException() {
        super(
                "VISIBILITY_RETIRED",
                "A trip is either published or it is not. Publishing to a private audience is no longer"
                        + " offered; your profile decides who sees what you share.");
    }
}
