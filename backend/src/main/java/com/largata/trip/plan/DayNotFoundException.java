package com.largata.trip.plan;

import com.largata.common.error.NotFoundException;


public class DayNotFoundException extends NotFoundException {

    public DayNotFoundException() {
        super("DAY_NOT_FOUND", "No such day.");
    }
}
