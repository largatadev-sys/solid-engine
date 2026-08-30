package com.largata.publication.web;

import com.largata.publication.ItineraryObject;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;


public record ItineraryObjectResponse(
        UUID id, UUID tripId, String audience, Instant publishedAt, JsonNode plan) {


    public static ItineraryObjectResponse of(ItineraryObject object, JsonNode plan) {
        return new ItineraryObjectResponse(
                object.id(), object.tripId(), object.audience().wireName(), object.publishedAt(), plan);
    }
}
