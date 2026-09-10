package com.largata.itinerary.exception;

import com.largata.common.error.NotFoundException;

public final class ItineraryObjectNotFoundException extends NotFoundException {

    public ItineraryObjectNotFoundException() {
        super("PUBLICATION_NOT_FOUND", "No such published itinerary.");
    }
}
