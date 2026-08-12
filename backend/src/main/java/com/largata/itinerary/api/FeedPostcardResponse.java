package com.largata.itinerary.api;

import com.largata.identity.api.TravelerCardResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;


public record FeedPostcardResponse(
        UUID id,
        TravelerCardResponse author,
        String tripTitle,
        UUID publishedItineraryId,
        String dayLabel,
        String activityTitle,
        String place,
        String caption,
        Instant sharedAt,
        List<DiaryPhotoResponse> photos) {}
