package com.largata.diary;

import com.largata.common.error.ConflictException;
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


    public static final class DiaryNeedsItsDatesException extends ValidationException {

        public DiaryNeedsItsDatesException() {
            super("DIARY_NEEDS_ITS_DATES", "A diary needs the dates the trip spanned.");
        }
    }


    public static final class DiaryEndsBeforeItStartsException extends ValidationException {

        public DiaryEndsBeforeItStartsException() {
            super("DIARY_ENDS_BEFORE_IT_STARTS", "A diary cannot end before it starts.");
        }
    }


    public static final class DiaryHasNotHappenedYetException extends ValidationException {

        public DiaryHasNotHappenedYetException() {
            super("DIARY_HAS_NOT_HAPPENED_YET", "A diary tells a trip you have already taken.");
        }
    }


    public static final class DiaryTooLongException extends ValidationException {

        public DiaryTooLongException(int limit) {
            super("DIARY_TOO_LONG", "A diary may span at most " + limit + " days.");
        }
    }


    public static final class DiaryDayNotFoundException extends NotFoundException {

        public DiaryDayNotFoundException() {
            super("DIARY_DAY_NOT_FOUND", "That day could not be found.");
        }
    }


    public static final class DiaryDayNeedsADateException extends ValidationException {

        public DiaryDayNeedsADateException() {
            super("DIARY_DAY_NEEDS_A_DATE", "A day needs a date.");
        }
    }


    public static final class DiaryDayAlreadyExistsException extends ConflictException {

        public DiaryDayAlreadyExistsException() {
            super("DIARY_DAY_ALREADY_EXISTS", "That day is already in this diary.");
        }
    }


    public static final class DiaryDayPlaceTooLongException extends ValidationException {

        public DiaryDayPlaceTooLongException(int limit) {
            super("DIARY_DAY_PLACE_TOO_LONG", "A place may be at most " + limit + " characters.");
        }
    }
}
