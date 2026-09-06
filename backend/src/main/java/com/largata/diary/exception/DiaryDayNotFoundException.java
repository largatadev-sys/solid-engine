package com.largata.diary.exception;

import com.largata.common.error.NotFoundException;

public final class DiaryDayNotFoundException extends NotFoundException {

    public DiaryDayNotFoundException() {
        super("DIARY_DAY_NOT_FOUND", "That day could not be found.");
    }
}
