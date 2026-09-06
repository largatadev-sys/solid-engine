package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryNeedsItsDatesException extends ValidationException {

    public DiaryNeedsItsDatesException() {
        super("DIARY_NEEDS_ITS_DATES", "A diary needs the dates the trip spanned.");
    }
}
