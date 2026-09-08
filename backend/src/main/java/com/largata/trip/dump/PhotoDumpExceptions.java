package com.largata.trip.dump;

import com.largata.common.error.ForbiddenException;


public final class PhotoDumpExceptions {

    private PhotoDumpExceptions() {}


    public static final class NotThePhotosUploaderException extends ForbiddenException {
        public NotThePhotosUploaderException() {
            super("NOT_PERMITTED", "Only the traveler who added this photo, or the trip owner, can remove it.");
        }
    }
}
