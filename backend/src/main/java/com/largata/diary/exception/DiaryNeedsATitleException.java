package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryNeedsATitleException extends ValidationException {

    public DiaryNeedsATitleException() {
        super("DIARY_NEEDS_A_TITLE", "A diary needs a title.");
    }
}
