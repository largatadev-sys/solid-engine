package com.largata.feed.dto;

import com.largata.identity.api.TravelerCardResponse;
import java.util.List;
import java.util.UUID;


public record PublicTripDiaryResponse(
        UUID itineraryId,
        TravelerCardResponse author,
        String tripTitle,
        UUID publishedItineraryId,
        List<FeedPostcardResponse> postcards) {}
