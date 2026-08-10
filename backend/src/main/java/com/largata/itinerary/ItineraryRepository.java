package com.largata.itinerary;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface ItineraryRepository extends JpaRepository<Itinerary, UUID> {


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds "
            + "AND (:state IS NULL OR i.state = :state) "
            + "ORDER BY i.id DESC")
    List<Itinerary> findFirstPage(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("state") ItineraryState state,
            Limit limit);


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds AND i.id < :cursor "
            + "AND (:state IS NULL OR i.state = :state) "
            + "ORDER BY i.id DESC")
    List<Itinerary> findPageAfter(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("cursor") UUID cursor,
            @Param("state") ItineraryState state,
            Limit limit);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE itinerary SET plan_version = plan_version + 1 WHERE id = :itineraryId",
            nativeQuery = true)
    void bumpPlanVersion(@Param("itineraryId") UUID itineraryId);


    @Query(value = "SELECT plan_version FROM itinerary WHERE id = :itineraryId FOR UPDATE",
            nativeQuery = true)
    Long lockedPlanVersion(@Param("itineraryId") UUID itineraryId);
}
