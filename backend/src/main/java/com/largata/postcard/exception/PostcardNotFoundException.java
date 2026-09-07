package com.largata.postcard.exception;

import com.largata.common.error.NotFoundException;

public final class PostcardNotFoundException extends NotFoundException {

    public PostcardNotFoundException() {
        super("POSTCARD_NOT_FOUND", "That postcard could not be found.");
    }
}
