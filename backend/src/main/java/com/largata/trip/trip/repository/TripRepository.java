package com.largata.trip.trip.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.largata.trip.api.TripLifecycle;
import com.largata.trip.trip.entity.Trip;


public interface TripRepository extends JpaRepository<Trip, UUID> {


    @Query("SELECT i.currency FROM Trip i WHERE i.id = :itineraryId")
    String findCurrency(@Param("itineraryId") UUID itineraryId);


    @Query("SELECT i FROM Trip i WHERE i.id IN :itineraryIds "
            + "AND (:state IS NULL OR i.state = :state) "
            + "ORDER BY i.id DESC")
    List<Trip> findFirstPage(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("state") TripLifecycle state,
            Limit limit);


    @Query("SELECT i FROM Trip i WHERE i.id IN :itineraryIds AND i.id < :cursor "
            + "AND (:state IS NULL OR i.state = :state) "
            + "ORDER BY i.id DESC")
    List<Trip> findPageAfter(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("cursor") UUID cursor,
            @Param("state") TripLifecycle state,
            Limit limit);


    @Query("SELECT COUNT(DISTINCT lower(trim(i.destination))) FROM Trip i "
            + "WHERE i.id IN :itineraryIds AND trim(i.destination) <> ''")
    long countDestinationsAmong(@Param("itineraryIds") Collection<UUID> itineraryIds);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE itinerary SET plan_version = plan_version + 1 WHERE id = :itineraryId",
            nativeQuery = true)
    void bumpPlanVersion(@Param("itineraryId") UUID itineraryId);


    @Query(value = "SELECT plan_version FROM itinerary WHERE id = :itineraryId FOR UPDATE",
            nativeQuery = true)
    Long lockedPlanVersion(@Param("itineraryId") UUID itineraryId);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            value =
                    "UPDATE itinerary SET share_card_version = share_card_version + 1 WHERE id = :itineraryId",
            nativeQuery = true)
    void bumpShareCardVersion(@Param("itineraryId") UUID itineraryId);


    @Query(value = "SELECT share_card_version FROM itinerary WHERE id = :itineraryId", nativeQuery = true)
    Long shareCardVersionOf(@Param("itineraryId") UUID itineraryId);
}
