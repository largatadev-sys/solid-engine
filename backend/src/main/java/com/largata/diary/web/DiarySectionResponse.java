package com.largata.diary.web;

import com.largata.diary.Diary;
import com.largata.diary.DiaryView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record DiarySectionResponse(
        UUID id,
        UUID tripId,
        UUID itineraryId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        DiaryPhotoResponse cover,
        int postcardCount,
        int dayCount,
        List<DiaryDayResponse> days,
        Instant createdAt,
        Instant updatedAt) {


    public static DiarySectionResponse of(DiaryView view, UUID itineraryId) {
        Diary diary = view.diary();
        return new DiarySectionResponse(
                diary.id(),
                diary.tripId(),
                itineraryId,
                diary.title(),
                diary.destination(),
                diary.startDate(),
                diary.endDate(),
                DiaryPhotoResponse.of(view.cover() == null ? view.fallbackCover() : view.cover()),
                view.postcardCount(),
                view.days().size(),
                view.days().stream().map(DiaryDayResponse::of).toList(),
                diary.createdAt(),
                diary.updatedAt());
    }
}
