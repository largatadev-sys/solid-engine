package com.largata.diary.exception;

import com.largata.common.error.ConflictException;


public final class DiaryRangeStrandsADayException extends ConflictException {

    public DiaryRangeStrandsADayException() {
        super(
                "DIARY_RANGE_STRANDS_A_DAY",
                "These dates would leave a day outside the diary. Delete that day first.");
    }
}
