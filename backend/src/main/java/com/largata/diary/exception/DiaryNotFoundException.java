package com.largata.diary.exception;

import com.largata.common.error.NotFoundException;

public final class DiaryNotFoundException extends NotFoundException {

    public DiaryNotFoundException() {
        super("DIARY_NOT_FOUND", "That diary could not be found.");
    }
}
