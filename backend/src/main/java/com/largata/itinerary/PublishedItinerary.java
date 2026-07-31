package com.largata.itinerary;

import com.largata.identity.TravelerSummary;
import java.util.List;
import java.util.UUID;


public record PublishedItinerary(
        UUID id,
        String title,
        List<String> destinations,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        int durationDays,
        TravelerSummary creator,
        EstimatedCost estimatedCost,
        List<DayView> days) {


    static PublishedItinerary of(Itinerary itinerary, List<DayView> plan, TravelerSummary creator) {
        return new PublishedItinerary(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.standouts(),
                itinerary.bestTimeOfYear(),
                itinerary.coverImageUrl(),
                plan.size(),
                creator,
                EstimatedCost.of(plan),
                plan);
    }
}
