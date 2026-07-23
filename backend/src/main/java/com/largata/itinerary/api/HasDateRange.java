package com.largata.itinerary.api;

import java.time.LocalDate;

/**
 * A request carrying an optional start/end date pair (S1.3, ticket 04) — the shape {@link
 * ChronologicalDates} validates.
 *
 * <p>Both {@link CreateItineraryRequest} and {@link UpdateItineraryRequest} implement it, so the one
 * cross-field date validator covers both without being tied to a single record type. A minimal
 * interface, not a base class: records cannot extend, and there is nothing to share but the two
 * accessors the validator reads.
 */
interface HasDateRange {

    LocalDate startDate();

    LocalDate endDate();
}
