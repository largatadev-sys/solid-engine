package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryDayNeedsADateException extends ValidationException {

    public DiaryDayNeedsADateException() {
        super("DIARY_DAY_NEEDS_A_DATE", "A day needs a date.");
    }
}
