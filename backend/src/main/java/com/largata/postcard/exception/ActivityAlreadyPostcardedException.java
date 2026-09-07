package com.largata.postcard.exception;

import com.largata.common.error.ConflictException;

public final class ActivityAlreadyPostcardedException extends ConflictException {

    public ActivityAlreadyPostcardedException() {
        super(
                "ACTIVITY_ALREADY_POSTCARDED",
                "You already posted a postcard from this activity. Open it to change it.");
    }
}
