package com.largata.itinerary.api;

import com.largata.identity.api.TravelerCardResponse;
import com.largata.trip.record.Trip;
import java.time.Instant;
import java.util.List;
import java.util.UUID;


public record DiscoveryCardResponse(
        UUID id,
        String title,
        String destination,
        int durationDays,
        String coverImageUrl,
        TravelerCardResponse author,
        Instant publishedAt) {


    public static DiscoveryCardResponse of(
            Trip itinerary, int durationDays, TravelerCardResponse author) {
        return new DiscoveryCardResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                durationDays,
                itinerary.coverImageUrl(),
                author,
                itinerary.publishedAt());
    }
}
