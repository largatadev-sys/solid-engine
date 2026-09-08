package com.largata.trip.plan.exception;

import com.largata.common.error.ValidationException;


public class TooManyActivityPhotosException extends ValidationException {

    public TooManyActivityPhotosException(int limit) {
        super(
                "TOO_MANY_ACTIVITY_PHOTOS",
                "An activity can hold " + limit + " photos. Remove one to add another.");
    }
}
