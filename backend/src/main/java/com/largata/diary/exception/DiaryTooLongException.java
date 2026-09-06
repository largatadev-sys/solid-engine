package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryTooLongException extends ValidationException {

    public DiaryTooLongException(int limit) {
        super("DIARY_TOO_LONG", "A diary may span at most " + limit + " days.");
    }
}
