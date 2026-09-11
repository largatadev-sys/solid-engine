package com.largata.feed.exception;

import com.largata.common.error.NotFoundException;


public final class FeedExceptions {

    public static final class NoSharedPostcardsException extends NotFoundException {

        public NoSharedPostcardsException() {
            super("DIARY_ENTRY_NOT_FOUND", "That diary entry could not be found.");
        }
    }

    private FeedExceptions() {}
}
