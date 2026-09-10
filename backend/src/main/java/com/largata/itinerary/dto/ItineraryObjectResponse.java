package com.largata.itinerary.dto;

import com.largata.itinerary.entity.ItineraryObject;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

public record ItineraryObjectResponse(UUID id, UUID tripId, Instant publishedAt, JsonNode plan) {


    public static ItineraryObjectResponse of(ItineraryObject object, JsonNode plan) {
        return new ItineraryObjectResponse(object.id(), object.tripId(), object.publishedAt(), plan);
    }
}
