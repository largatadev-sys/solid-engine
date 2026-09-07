package com.largata.postcard.exception;

import com.largata.common.error.ValidationException;

public final class PostcardNeedsAPhotoException extends ValidationException {

    public PostcardNeedsAPhotoException() {
        super("POSTCARD_NEEDS_A_PHOTO", "A postcard needs at least one photo.");
    }
}
