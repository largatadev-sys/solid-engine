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
        List<String> destinations,
        String description,
        int durationDays,
        TravelerCardResponse creator,
        EstimatedCostResponse estimatedCost,
        List<PublishedDayResponse> days) {


    public static PublishedItineraryResponse of(PublishedItinerary projection) {
        return new PublishedItineraryResponse(
                projection.id(),
                projection.title(),
                projection.destinations(),
                projection.description(),
                projection.durationDays(),
                TravelerCardResponse.of(projection.creator()),
                EstimatedCostResponse.of(projection.estimatedCost()),
                projection.days().stream().map(PublishedDayResponse::of).toList());
    }


    public record EstimatedCostResponse(
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount, String currency) {

        static EstimatedCostResponse of(EstimatedCost cost) {
            return cost == null ? null : new EstimatedCostResponse(cost.amount(), cost.currency());
        }
    }
}
