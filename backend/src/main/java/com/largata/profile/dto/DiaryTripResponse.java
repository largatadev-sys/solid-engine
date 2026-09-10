package com.largata.profile.dto;

import java.util.UUID;


public record DiaryTripResponse(
        UUID itineraryId,
        String title,
        long entryCount,
        String destination,
        int dayCount,
        String coverImageUrl) {}
