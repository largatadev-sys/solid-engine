package com.largata.common.authz;

import com.largata.common.error.NotFoundException;


public class ItineraryNotFoundException extends NotFoundException {

    ItineraryNotFoundException() {
        super("ITINERARY_NOT_FOUND", "No such itinerary.");
    }
}
