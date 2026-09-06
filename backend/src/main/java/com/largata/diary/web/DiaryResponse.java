package com.largata.diary.web;

import com.largata.common.geo.PinPayload;
import com.largata.diary.Diary;
import com.largata.diary.DiaryView;
import com.largata.identity.api.TravelerCardResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record DiaryResponse(
        UUID id,
        UUID authorId,
        TravelerCardResponse author,
        UUID tripId,
        String title,
        String destination,
        PinPayload pin,
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
                view.author() == null ? null : TravelerCardResponse.of(view.author()),
                diary.tripId(),
                diary.title(),
                diary.destination(),
                PinPayload.of(diary.pin()),
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
