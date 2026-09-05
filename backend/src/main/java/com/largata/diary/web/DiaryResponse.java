package com.largata.diary.web;

import com.largata.diary.Diary;
import java.time.Instant;
import java.util.UUID;


public record DiaryResponse(UUID id, UUID tripId, String title, Instant createdAt, Instant updatedAt) {


    public static DiaryResponse of(Diary diary) {
        return new DiaryResponse(
                diary.id(), diary.tripId(), diary.title(), diary.createdAt(), diary.updatedAt());
    }
}
