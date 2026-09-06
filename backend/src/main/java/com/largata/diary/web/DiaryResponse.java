package com.largata.diary.web;

import com.largata.diary.Diary;
import com.largata.diary.DiaryView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record DiaryResponse(
        UUID id,
        UUID authorId,
        UUID tripId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        DiaryPhotoResponse cover,
        int postcardCount,
        int dayCount,
        List<DiaryDayResponse> days,
        List<LocalDate> candidateDates,
        Instant createdAt,
        Instant updatedAt) {


    public static DiaryResponse of(DiaryView view) {
        Diary diary = view.diary();
        return new DiaryResponse(
                diary.id(),
                diary.authorId(),
                diary.tripId(),
                diary.title(),
                diary.destination(),
                diary.startDate(),
                diary.endDate(),
                DiaryPhotoResponse.of(view.cover() == null ? view.fallbackCover() : view.cover()),
                view.postcardCount(),
                view.days().size(),
                view.days().stream().map(DiaryDayResponse::of).toList(),
                view.candidateDates(),
                diary.createdAt(),
                diary.updatedAt());
    }
}
