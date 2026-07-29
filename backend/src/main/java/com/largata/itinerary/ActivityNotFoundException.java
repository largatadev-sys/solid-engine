package com.largata.itinerary;

import com.largata.common.error.NotFoundException;


class ActivityNotFoundException extends NotFoundException {

    ActivityNotFoundException() {
        super("ACTIVITY_NOT_FOUND", "No such activity.");
    }
}
