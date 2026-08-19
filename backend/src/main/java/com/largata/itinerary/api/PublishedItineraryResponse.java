package com.largata.itinerary.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.EstimatedCost;
import com.largata.itinerary.PublishedItinerary;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


public record PublishedItineraryResponse(
        UUID id,
        String title,
        String destination,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        int durationDays,
        TravelerCardResponse creator,
        EstimatedCostResponse estimatedCost,
        List<PublishedDayResponse> days,
        long forkCount,
        ForkedFromResponse forkedFrom) {


    public static PublishedItineraryResponse of(PublishedItinerary projection) {
        return new PublishedItineraryResponse(
                projection.id(),
                projection.title(),
                projection.destination(),
                projection.description(),
                projection.standouts(),
                projection.bestTimeOfYear(),
                projection.coverImageUrl(),
                projection.durationDays(),
                TravelerCardResponse.of(projection.creator()),
                EstimatedCostResponse.of(projection.estimatedCost()),
                projection.days().stream().map(PublishedDayResponse::of).toList(),
                projection.forkCount(),
                ForkedFromResponse.of(projection.forkedFrom()));
    }


    public record EstimatedCostResponse(
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
            String currency,
            boolean partial) {

        static EstimatedCostResponse of(EstimatedCost cost) {
            return cost == null
                    ? null
                    : new EstimatedCostResponse(cost.amount(), cost.currency(), cost.partial());
        }
    }
}
