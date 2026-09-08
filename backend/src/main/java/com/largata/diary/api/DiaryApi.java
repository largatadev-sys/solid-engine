package com.largata.diary.api;

import java.time.LocalDate;
import java.util.UUID;

public interface DiaryApi {

    UUID mintTripDiary(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate);

    DiaryDayView mintTripDay(UUID diaryId, UUID tripDayId, String tripDayTitle, int ordinal);

    void requireOwn(UUID authorId, UUID diaryId);

    DiaryDayView requireDayIn(UUID authorId, UUID diaryId, UUID dayId);

    DiaryDayView dayOf(UUID dayId);
}
