package com.largata.trip.plan;

import com.largata.common.error.ConflictException;


public class StaleReorderException extends ConflictException {

    StaleReorderException() {
        super(
                "STALE_REORDER",
                "This day's activities changed while you were reordering them. Refresh and try again.");
    }
}
