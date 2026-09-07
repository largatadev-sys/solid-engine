package com.largata.publication.repository;

import com.largata.publication.entity.ItineraryObject;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItineraryObjectRepository extends JpaRepository<ItineraryObject, UUID> {

    Optional<ItineraryObject> findByTripId(UUID tripId);
}
