package com.largata.itinerary;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The edit lease's persistence, package-private (ADR-002): everything outside the module reaches the
 * lock through {@link EditLeaseService}. Keyed by itinerary id — the lease's primary key (V8).
 */
interface EditLeaseRepository extends JpaRepository<EditLease, UUID> {

    /** The lease row for an itinerary, if any exists — live or lapsed; the caller checks the clock. */
    Optional<EditLease> findByItineraryId(UUID itineraryId);
}
