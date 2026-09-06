package com.largata.diary.dto;

import com.largata.diary.entity.Diary;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DiarySummaryResponse(
        UUID id,
        UUID tripId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        Instant createdAt,
        Instant updatedAt) {


    public static DiarySummaryResponse of(Diary diary) {
        return new DiarySummaryResponse(
                diary.id(),
                diary.tripId(),
                diary.title(),
                diary.destination(),
                diary.startDate(),
                diary.endDate(),
                diary.createdAt(),
                diary.updatedAt());
    }
}
