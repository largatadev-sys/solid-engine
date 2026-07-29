package com.largata.itinerary.api;

import com.largata.itinerary.DayView;
import com.largata.itinerary.Itinerary;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record ItineraryResponse(
        UUID id,
        String title,
        List<String> destinations,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        String visibility,
        boolean archived,
        UUID lastEditedBy,
        Instant lastEditedAt,
        List<DayResponse> days,
        Instant createdAt) {


    public static ItineraryResponse of(Itinerary itinerary) {
        return of(itinerary, List.of(), false);
    }


    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days) {
        return of(itinerary, days, false);
    }


    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days, boolean archived) {
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                archived,
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                days.stream().map(DayResponse::of).toList(),
                itinerary.createdAt());
    }
}
