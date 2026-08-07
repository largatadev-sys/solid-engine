package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class TooManyActivityPhotosException extends ValidationException {

    TooManyActivityPhotosException(int limit) {
        super(
                "TOO_MANY_ACTIVITY_PHOTOS",
                "An activity can hold " + limit + " photos. Remove one to add another.");
    }
}
