package com.largata.trip.exception;

import com.largata.common.error.ConflictException;


public class ItineraryPublishedException extends ConflictException {

    public ItineraryPublishedException() {
        super(
                "ITINERARY_PUBLISHED",
                "Unpublish this trip to edit it. Unpublishing takes the page down and thaws editing.");
    }
}
