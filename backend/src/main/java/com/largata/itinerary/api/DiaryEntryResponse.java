package com.largata.itinerary.api;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;


public record DiaryEntryResponse(
        UUID id,
        UUID itineraryId,
        UUID activityId,
        String activityTitle,
        String dayLabel,
        LocalTime timeOfDay,
        String caption,
        List<DiaryPhotoResponse> photos,
        Instant createdAt,
        Instant updatedAt) {}
