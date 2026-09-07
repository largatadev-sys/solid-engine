package com.largata.postcard.exception;

import com.largata.common.error.ConflictException;

public final class PostcardAlreadyFiledException extends ConflictException {

    public PostcardAlreadyFiledException() {
        super(
                "POSTCARD_ALREADY_FILED",
                "This postcard is already in a diary. Delete it to post it somewhere else.");
    }
}
