package com.largata.itinerary;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface EditLeaseRepository extends JpaRepository<EditLease, UUID> {


    Optional<EditLease> findByItineraryId(UUID itineraryId);
}
