package com.largata.itinerary.api;

import com.largata.trip.record.Itinerary;
import java.util.List;
import java.util.UUID;


public record ShowcaseItineraryResponse(
        UUID id, String title, String destination, int durationDays, String coverImageUrl) {


    public static ShowcaseItineraryResponse of(Itinerary itinerary, int durationDays) {
        return new ShowcaseItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                durationDays,
                itinerary.coverImageUrl());
    }
}
