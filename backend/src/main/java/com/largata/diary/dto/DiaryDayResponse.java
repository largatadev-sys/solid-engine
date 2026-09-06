package com.largata.diary.dto;

import com.largata.common.geo.PinPayload;
import com.largata.diary.api.DiaryContents;
import com.largata.diary.entity.DiaryDay;
import com.largata.diary.service.DiaryView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DiaryDayResponse(
        UUID id,
        int ordinal,
        LocalDate date,
        String place,
        PinPayload pin,
        UUID tripDayId,
        int postcardCount,
        List<DiaryPostcardResponse> postcards,
        Instant createdAt,
        Instant updatedAt) {


    public static DiaryDayResponse of(DiaryView.Day day) {
        return of(day.day(), day.postcardCount(), day.postcards());
    }


    public static DiaryDayResponse of(
            DiaryDay day, int postcardCount, List<DiaryContents.Card> postcards) {
        return new DiaryDayResponse(
                day.id(),
                day.ordinal(),
                day.date(),
                day.place(),
                PinPayload.of(day.pin()),
                day.tripDayId(),
                postcardCount,
                postcards.stream().map(card -> DiaryPostcardResponse.of(card, day.place())).toList(),
                day.createdAt(),
                day.updatedAt());
    }
}
