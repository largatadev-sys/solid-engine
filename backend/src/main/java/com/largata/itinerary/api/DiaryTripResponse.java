package com.largata.itinerary.api;

import java.util.List;
import java.util.UUID;


public record DiaryTripResponse(
        UUID itineraryId,
        String title,
        long entryCount,
        List<String> destinations,
        int dayCount,
        String coverImageUrl) {}
