package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The itinerary as the API shows it — one shape for create and for fetch, because they return the
 * same thing and two shapes would be two contracts to keep additive.
 *
 * <p><strong>{@code state} and {@code visibility} ship now, though both are constant in S0.3.</strong>
 * Nothing in this story can produce anything but {@code draft}/{@code private} — the transitions
 * arrive at S1.7 and S4.1. They are here anyway because the AC ("created itinerary is draft with
 * private visibility") is only directly testable if the client can see them, and because a client
 * that already reads the fields needs no change when the values start varying. Omission is free
 * under additive-only; adding later is free too — but a client shipped without them would have to be
 * updated to notice a trip had been published.
 *
 * <p><strong>{@code ownerId} is deliberately absent.</strong> S0.3 returns only the caller's own
 * itineraries, so it would say "you" in every response — and the moment E1 makes workspaces real,
 * "who owns this" becomes a question about membership, answered by the endpoint that owns that
 * question rather than smuggled onto this one.
 */
public record ItineraryResponse(
        UUID id,
        String title,
        List<String> destinations,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        String visibility,
        Instant createdAt) {

    public static ItineraryResponse of(Itinerary itinerary) {
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                itinerary.createdAt());
    }
}
