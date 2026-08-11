package com.largata.itinerary;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface DayRepository extends JpaRepository<Day, UUID> {


    @Query("SELECT d.itineraryId AS itineraryId, COUNT(d) AS dayCount FROM Day d "
            + "WHERE d.itineraryId IN :itineraryIds GROUP BY d.itineraryId")
    List<DayCountRow> countByItineraryIdIn(@Param("itineraryIds") Collection<UUID> itineraryIds);


    interface DayCountRow {

        UUID getItineraryId();

        long getDayCount();
    }


    List<Day> findByItineraryIdOrderByOrdinalAsc(UUID itineraryId);


    Optional<Day> findByIdAndItineraryId(UUID id, UUID itineraryId);


    long countByItineraryId(UUID itineraryId);
}
