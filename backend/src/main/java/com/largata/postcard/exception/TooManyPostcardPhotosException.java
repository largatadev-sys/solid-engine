package com.largata.postcard.exception;

import com.largata.common.error.ValidationException;

public final class TooManyPostcardPhotosException extends ValidationException {

    public TooManyPostcardPhotosException(int limit) {
        super(
                "TOO_MANY_POSTCARD_PHOTOS",
                "A postcard holds " + limit + " photos. Remove one to add another.");
    }
}
