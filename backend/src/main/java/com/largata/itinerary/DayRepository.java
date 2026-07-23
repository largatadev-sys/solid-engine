package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The Day child's persistence, package-private (ADR-002): everything outside the module reaches days
 * through {@link ItineraryService}.
 */
interface DayRepository extends JpaRepository<Day, UUID> {

    /** A plan's days, in order — the read every plan view walks (served by {@code day_itinerary_ordinal_idx}). */
    List<Day> findByItineraryIdOrderByOrdinalAsc(UUID itineraryId);

    /** One day, scoped to its itinerary: the id must belong to the plan the guard authorized, not any plan. */
    Optional<Day> findByIdAndItineraryId(UUID id, UUID itineraryId);

    /** The current day count — the ordinal the next appended day takes (count + 1). */
    long countByItineraryId(UUID itineraryId);
}
