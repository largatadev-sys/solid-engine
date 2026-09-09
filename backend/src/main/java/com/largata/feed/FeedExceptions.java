package com.largata.feed;

import com.largata.common.error.NotFoundException;


final class FeedExceptions {

    static final class NoSharedPostcardsException extends NotFoundException {

        NoSharedPostcardsException() {
            super("DIARY_ENTRY_NOT_FOUND", "That diary entry could not be found.");
        }
    }

    private FeedExceptions() {}
}
