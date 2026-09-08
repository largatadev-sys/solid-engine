package com.largata.trip.plan;

import com.largata.common.error.NotFoundException;


public class ActivityNotFoundException extends NotFoundException {

    public ActivityNotFoundException() {
        super("ACTIVITY_NOT_FOUND", "No such activity.");
    }
}
