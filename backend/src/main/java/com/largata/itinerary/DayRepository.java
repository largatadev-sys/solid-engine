package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface DayRepository extends JpaRepository<Day, UUID> {


    List<Day> findByItineraryIdOrderByOrdinalAsc(UUID itineraryId);


    Optional<Day> findByIdAndItineraryId(UUID id, UUID itineraryId);


    long countByItineraryId(UUID itineraryId);
}
