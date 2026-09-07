package com.largata.diary.exception;

import com.largata.common.error.ValidationException;


public final class DiaryDayOutsideRangeException extends ValidationException {

    public DiaryDayOutsideRangeException() {
        super(
                "DIARY_DAY_OUTSIDE_RANGE",
                "That day is outside this diary's dates. Change the dates to include it first.");
    }
}
