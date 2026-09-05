package com.largata.diary;

import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


public final class DiaryExceptions {

    private DiaryExceptions() {}


    public static final class DiaryNotFoundException extends NotFoundException {

        public DiaryNotFoundException() {
            super("DIARY_NOT_FOUND", "That diary could not be found.");
        }
    }


    public static final class DiaryNeedsATitleException extends ValidationException {

        public DiaryNeedsATitleException() {
            super("DIARY_NEEDS_A_TITLE", "A diary needs a title.");
        }
    }


    public static final class DiaryTitleTooLongException extends ValidationException {

        public DiaryTitleTooLongException(int limit) {
            super("DIARY_TITLE_TOO_LONG", "A diary title may be at most " + limit + " characters.");
        }
    }
}
