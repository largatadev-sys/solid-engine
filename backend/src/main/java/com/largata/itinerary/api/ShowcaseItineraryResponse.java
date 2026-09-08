package com.largata.itinerary.api;

import com.largata.trip.trip.entity.Trip;
import java.util.List;
import java.util.UUID;


public record ShowcaseItineraryResponse(
        UUID id, String title, String destination, int durationDays, String coverImageUrl) {


    public static ShowcaseItineraryResponse of(Trip itinerary, int durationDays) {
        return new ShowcaseItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                durationDays,
                itinerary.coverImageUrl());
    }
}
