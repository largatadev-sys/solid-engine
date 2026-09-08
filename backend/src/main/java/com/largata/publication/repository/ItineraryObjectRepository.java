package com.largata.publication.repository;

import com.largata.publication.entity.ItineraryObject;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItineraryObjectRepository extends JpaRepository<ItineraryObject, UUID> {

    Optional<ItineraryObject> findByTripId(UUID tripId);

    @Query("SELECT o FROM ItineraryObject o WHERE o.tripId IN :tripIds AND o.retired = false")
    List<ItineraryObject> findLiveByTripIdIn(@Param("tripIds") Collection<UUID> tripIds);
}
