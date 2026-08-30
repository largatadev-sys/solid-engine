package com.largata.postcard;

import com.largata.common.error.ConflictException;
import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


public final class PostcardExceptions {

    private PostcardExceptions() {}


    public static final class PostcardNotFoundException extends NotFoundException {

        public PostcardNotFoundException() {
            super("POSTCARD_NOT_FOUND", "That postcard could not be found.");
        }
    }


    public static final class PostcardNeedsAPhotoException extends ValidationException {

        public PostcardNeedsAPhotoException() {
            super("POSTCARD_NEEDS_A_PHOTO", "A postcard needs at least one photo.");
        }
    }


    public static final class TooManyPostcardPhotosException extends ValidationException {

        public TooManyPostcardPhotosException(int limit) {
            super(
                    "TOO_MANY_POSTCARD_PHOTOS",
                    "A postcard holds " + limit + " photos. Remove one to add another.");
        }
    }


    public static final class PostcardCaptionTooLongException extends ValidationException {

        public PostcardCaptionTooLongException(int limit) {
            super(
                    "POSTCARD_CAPTION_TOO_LONG",
                    "A caption may be at most " + limit + " characters.");
        }
    }


    public static final class TripNotStartedException extends ValidationException {

        public TripNotStartedException() {
            super("TRIP_NOT_STARTED", "You can post a postcard once the trip has started.");
        }
    }


    public static final class PostcardActivityNotFoundException extends NotFoundException {

        public PostcardActivityNotFoundException() {
            super("ACTIVITY_NOT_FOUND", "No such activity.");
        }
    }


    public static final class ActivityAlreadyPostcardedException extends ConflictException {

        public ActivityAlreadyPostcardedException() {
            super(
                    "ACTIVITY_ALREADY_POSTCARDED",
                    "You already posted a postcard from this activity. Open it to change it.");
        }
    }
}
