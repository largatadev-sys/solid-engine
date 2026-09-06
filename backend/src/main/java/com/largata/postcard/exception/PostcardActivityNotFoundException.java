package com.largata.postcard.exception;

import com.largata.common.error.NotFoundException;

public final class PostcardActivityNotFoundException extends NotFoundException {

    public PostcardActivityNotFoundException() {
        super("ACTIVITY_NOT_FOUND", "No such activity.");
    }
}
