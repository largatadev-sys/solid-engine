package com.largata.media;

import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


public final class MediaExceptions {

    private MediaExceptions() {}


    public static final class PhotoNotFoundException extends NotFoundException {

        public PhotoNotFoundException() {
            super("PHOTO_NOT_FOUND", "That photo could not be found.");
        }
    }


    public static final class NotAnImageException extends ValidationException {

        NotAnImageException() {
            super("NOT_AN_IMAGE", "That file is not an image we can read. Try a JPEG or PNG photo.");
        }
    }


    public static final class PhotoTooLargeException extends ValidationException {

        PhotoTooLargeException(int limitBytes) {
            super(
                    "PHOTO_TOO_LARGE",
                    "That photo is too large. The limit is " + (limitBytes / (1024 * 1024)) + " MB.");
        }
    }
}
