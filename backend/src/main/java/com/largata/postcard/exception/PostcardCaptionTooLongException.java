package com.largata.postcard.exception;

import com.largata.common.error.ValidationException;

public final class PostcardCaptionTooLongException extends ValidationException {

    public PostcardCaptionTooLongException(int limit) {
        super(
                "POSTCARD_CAPTION_TOO_LONG",
                "A caption may be at most " + limit + " characters.");
    }
}
