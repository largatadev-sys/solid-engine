package com.largata.itinerary;

import com.largata.common.error.ConflictException;
import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


final class DiaryExceptions {

    private DiaryExceptions() {}


    static final class TripNotStartedException extends ValidationException {

        TripNotStartedException() {
            super(
                    "TRIP_NOT_STARTED",
                    "You can add to your diary once the trip has started.");
        }
    }


    static final class ActivityAlreadyInDiaryException extends ConflictException {

        ActivityAlreadyInDiaryException() {
            super(
                    "ACTIVITY_ALREADY_IN_DIARY",
                    "This activity is already in your diary. Open the entry to change it.");
        }
    }


    static final class DiaryEntryNotFoundException extends NotFoundException {

        DiaryEntryNotFoundException() {
            super("DIARY_ENTRY_NOT_FOUND", "That diary entry could not be found.");
        }
    }


    static final class TooManyDiaryPhotosException extends ValidationException {

        TooManyDiaryPhotosException(int limit) {
            super(
                    "TOO_MANY_DIARY_PHOTOS",
                    "A diary entry holds " + limit + " photos. Remove one to add another.");
        }
    }


    static final class DiaryEntryNeedsAPhotoException extends ValidationException {

        DiaryEntryNeedsAPhotoException() {
            super("DIARY_ENTRY_NEEDS_A_PHOTO", "A diary entry needs at least one photo.");
        }
    }
}
