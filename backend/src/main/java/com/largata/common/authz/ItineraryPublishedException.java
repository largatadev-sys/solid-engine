package com.largata.common.authz;

import com.largata.common.error.ConflictException;


public class ItineraryPublishedException extends ConflictException {

    public ItineraryPublishedException() {
        super("ITINERARY_PUBLISHED", "Unpublish this trip to edit it. Unpublishing returns it to a draft.");
    }
}
