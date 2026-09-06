package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryEndsBeforeItStartsException extends ValidationException {

    public DiaryEndsBeforeItStartsException() {
        super("DIARY_ENDS_BEFORE_IT_STARTS", "A diary cannot end before it starts.");
    }
}
