package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryTitleTooLongException extends ValidationException {

    public DiaryTitleTooLongException(int limit) {
        super("DIARY_TITLE_TOO_LONG", "A diary title may be at most " + limit + " characters.");
    }
}
