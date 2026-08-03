package com.largata.itinerary;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface ItineraryRepository extends JpaRepository<Itinerary, UUID> {


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds "
            + "AND (:status IS NULL OR i.status = :status) "
            + "ORDER BY i.id DESC")
    List<Itinerary> findFirstPage(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("status") ItineraryStatus status,
            Limit limit);


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds AND i.id < :cursor "
            + "AND (:status IS NULL OR i.status = :status) "
            + "ORDER BY i.id DESC")
    List<Itinerary> findPageAfter(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("cursor") UUID cursor,
            @Param("status") ItineraryStatus status,
            Limit limit);

}
