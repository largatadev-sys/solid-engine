package com.largata.diary.exception;

import com.largata.common.error.ValidationException;

public final class DiaryHasNotHappenedYetException extends ValidationException {

    public DiaryHasNotHappenedYetException() {
        super("DIARY_HAS_NOT_HAPPENED_YET", "A diary tells a trip you have already taken.");
    }
}
