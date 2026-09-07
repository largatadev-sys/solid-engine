package com.largata.diary.dto;

import com.largata.common.geo.PinPayload;
import com.largata.diary.api.DiaryContents;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiaryPostcardResponse(
        UUID id,
        UUID diaryId,
        UUID diaryDayId,
        UUID tripId,
        UUID activityId,
        String activityTitle,
        String dayLabel,
        String caption,
        String place,
        PinPayload pin,
        List<DiaryPhotoResponse> photos,
        Instant createdAt,
        Instant updatedAt) {


    public static DiaryPostcardResponse of(DiaryContents.Card card, String dayPlace) {
        return new DiaryPostcardResponse(
                card.id(),
                card.diaryId(),
                card.diaryDayId(),
                card.tripId(),
                card.activityId(),
                card.activityTitle(),
                card.dayLabel(),
                card.caption(),
                card.place() == null ? dayPlace : card.place(),
                PinPayload.of(card.pin()),
                card.photos().stream().map(DiaryPhotoResponse::of).toList(),
                card.createdAt(),
                card.updatedAt());
    }
}
