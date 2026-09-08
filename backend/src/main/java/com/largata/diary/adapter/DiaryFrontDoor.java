package com.largata.diary.adapter;

import com.largata.diary.api.DiaryApi;
import com.largata.diary.api.DiaryDayView;
import com.largata.diary.entity.DiaryDay;
import com.largata.diary.service.DiaryService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class DiaryFrontDoor implements DiaryApi {

    private final DiaryService diaries;

    DiaryFrontDoor(DiaryService diaries) {
        this.diaries = diaries;
    }


    @Override
    public UUID mintTripDiary(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate) {
        return diaries.mintTripDiary(authorId, tripId, title, destination, startDate, endDate).id();
    }


    @Override
    public DiaryDayView mintTripDay(
            UUID diaryId, UUID tripDayId, String tripDayTitle, int ordinal) {
        return viewOf(diaries.mintTripDay(diaryId, tripDayId, tripDayTitle, ordinal));
    }


    @Override
    public void requireOwn(UUID authorId, UUID diaryId) {
        diaries.requireOwn(authorId, diaryId);
    }


    @Override
    public DiaryDayView requireDayIn(UUID authorId, UUID diaryId, UUID dayId) {
        return viewOf(diaries.requireDayIn(authorId, diaryId, dayId));
    }


    @Override
    public DiaryDayView dayOf(UUID dayId) {
        return viewOf(diaries.dayOf(dayId));
    }


    private static DiaryDayView viewOf(DiaryDay day) {
        return new DiaryDayView(day.id(), day.ordinal(), day.place(), day.tripDayTitle());
    }
}
