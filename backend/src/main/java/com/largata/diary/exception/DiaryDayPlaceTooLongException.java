package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryDayPlaceTooLongException extends ValidationException {

    public DiaryDayPlaceTooLongException(int limit) {
        super("DIARY_DAY_PLACE_TOO_LONG", "A place may be at most " + limit + " characters.");
    }
}
