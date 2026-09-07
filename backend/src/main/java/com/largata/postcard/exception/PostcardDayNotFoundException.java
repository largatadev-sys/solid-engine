package com.largata.postcard.exception;

import com.largata.common.error.NotFoundException;

public final class PostcardDayNotFoundException extends NotFoundException {

    public PostcardDayNotFoundException() {
        super("DAY_NOT_FOUND", "No such day.");
    }
}
