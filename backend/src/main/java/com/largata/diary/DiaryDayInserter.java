package com.largata.diary;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class DiaryDayInserter {

    private final DiaryDayRepository days;

    DiaryDayInserter(DiaryDayRepository days) {
        this.days = days;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    DiaryDay insert(UUID diaryId, int ordinal, LocalDate date, String place, Instant at) {
        return days.saveAndFlush(DiaryDay.on(diaryId, ordinal, date, place, at));
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    DiaryDay insertSnapshot(
            UUID diaryId,
            int ordinal,
            LocalDate date,
            String place,
            UUID tripDayId,
            String tripDayTitle,
            Instant at) {
        return days.saveAndFlush(
                DiaryDay.snapshotOfTripDay(
                        diaryId, ordinal, date, place, tripDayId, tripDayTitle, at));
    }
}
