package com.largata.diary.exception;

import com.largata.common.error.ConflictException;

public final class DiaryDayAlreadyExistsException extends ConflictException {

    public DiaryDayAlreadyExistsException() {
        super("DIARY_DAY_ALREADY_EXISTS", "That day is already in this diary.");
    }
}
