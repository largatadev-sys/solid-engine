package com.largata.itinerary;

import java.util.List;

/**
 * An itinerary together with its day/activity plan (S1.3) — what the single-fetch endpoint returns,
 * so the controller maps one object rather than composing the root and its days itself.
 *
 * <p>A read-model, not an entity: assembled by {@link ItineraryService#viewPlan} from the root and
 * {@link DayService#plan}, and consumed by {@code ItineraryResponse.of(itinerary, days, archived)}.
 *
 * <p><strong>{@code archived} lives here rather than on {@link Itinerary} because it is not the
 * itinerary's fact</strong> (S1.9): it belongs to the trip's workspace, which this module reaches by
 * service interface only (ADR-002). A read-model is the right home for a value composed from two
 * modules — assembled per request, stored nowhere, so the aggregate never has to pretend to own a
 * column it cannot see.
 */
public record ItineraryPlan(Itinerary itinerary, List<DayView> days, boolean archived) {}
