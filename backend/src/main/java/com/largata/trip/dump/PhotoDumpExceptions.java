package com.largata.trip.dump;

import com.largata.common.error.ForbiddenException;


final class PhotoDumpExceptions {

    private PhotoDumpExceptions() {}


    static final class NotThePhotosUploaderException extends ForbiddenException {
        NotThePhotosUploaderException() {
            super("NOT_PERMITTED", "Only the traveler who added this photo, or the trip owner, can remove it.");
        }
    }
}
