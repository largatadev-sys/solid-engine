package com.largata.itinerary;

import com.largata.common.error.NotFoundException;


class DayNotFoundException extends NotFoundException {

    DayNotFoundException() {
        super("DAY_NOT_FOUND", "No such day.");
    }
}
