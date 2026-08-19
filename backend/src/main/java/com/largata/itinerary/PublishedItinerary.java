package com.largata.itinerary;

import com.largata.identity.TravelerSummary;
import java.util.List;
import java.util.UUID;


public record PublishedItinerary(
        UUID id,
        String title,
        String destination,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        int durationDays,
        TravelerSummary creator,
        EstimatedCost estimatedCost,
        List<DayView> days,
        long forkCount,
        ForkService.ForkProvenance forkedFrom) {


    static PublishedItinerary of(
            Itinerary itinerary,
            List<DayView> plan,
            TravelerSummary creator,
            long forkCount,
            ForkService.ForkProvenance forkedFrom) {
        return new PublishedItinerary(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                itinerary.description(),
                itinerary.standouts(),
                itinerary.bestTimeOfYear(),
                itinerary.coverImageUrl(),
                plan.size(),
                creator,
                EstimatedCost.derivedFrom(plan).orElse(null),
                plan,
                forkCount,
                forkedFrom);
    }
}
