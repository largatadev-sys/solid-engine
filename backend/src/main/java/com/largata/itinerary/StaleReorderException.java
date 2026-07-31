package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class StaleReorderException extends ConflictException {

    StaleReorderException() {
        super(
                "STALE_REORDER",
                "This day's activities changed while you were reordering them. Refresh and try again.");
    }
}
