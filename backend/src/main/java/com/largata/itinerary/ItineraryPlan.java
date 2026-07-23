package com.largata.itinerary;

import java.util.List;

/**
 * An itinerary together with its day/activity plan (S1.3) — what the single-fetch endpoint returns,
 * so the controller maps one object rather than composing the root and its days itself.
 *
 * <p>A read-model, not an entity: assembled by {@link ItineraryService#viewPlan} from the root and
 * {@link DayService#plan}, and consumed by {@code ItineraryResponse.of(itinerary, days)}.
 */
public record ItineraryPlan(Itinerary itinerary, List<DayView> days) {}
