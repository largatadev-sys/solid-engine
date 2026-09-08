package com.largata.trip.plan.exception;

import com.largata.common.error.ConflictException;


public class StaleReorderException extends ConflictException {

    public StaleReorderException() {
        super(
                "STALE_REORDER",
                "This day's activities changed while you were reordering them. Refresh and try again.");
    }
}
