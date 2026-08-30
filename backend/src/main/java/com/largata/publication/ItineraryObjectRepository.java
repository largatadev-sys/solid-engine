package com.largata.publication;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface ItineraryObjectRepository extends JpaRepository<ItineraryObject, UUID> {

    Optional<ItineraryObject> findByTripId(UUID tripId);
}
