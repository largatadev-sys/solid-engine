package com.largata.trip.fork;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ForkRelationshipRepository extends JpaRepository<ForkRelationship, UUID> {


    long countBySourceItineraryId(UUID sourceItineraryId);


    Optional<ForkRelationship> findByForkedItineraryId(UUID forkedItineraryId);
}
