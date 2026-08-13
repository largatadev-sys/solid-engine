package com.largata.itinerary;

import java.time.Instant;
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


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds AND i.published = true "
            + "ORDER BY i.id DESC")
    List<Itinerary> findFirstPublishedPage(
            @Param("itineraryIds") Collection<UUID> itineraryIds, Limit limit);


    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds AND i.published = true "
            + "AND i.id < :cursor ORDER BY i.id DESC")
    List<Itinerary> findPublishedPageAfter(
            @Param("itineraryIds") Collection<UUID> itineraryIds,
            @Param("cursor") UUID cursor,
            Limit limit);


    @Query("SELECT COUNT(i) FROM Itinerary i WHERE i.id IN :itineraryIds AND i.published = true")
    long countPublishedAmong(@Param("itineraryIds") Collection<UUID> itineraryIds);


    @Query("SELECT i FROM Itinerary i WHERE i.published = true "
            + "AND i.visibility = com.largata.itinerary.Visibility.PUBLIC "
            + "AND i.id NOT IN :archivedIds "
            + "ORDER BY i.publishedAt DESC, i.id DESC")
    List<Itinerary> findFirstDiscoveryPage(
            @Param("archivedIds") Collection<UUID> archivedIds, Limit limit);


    @Query("SELECT i FROM Itinerary i WHERE i.published = true "
            + "AND i.visibility = com.largata.itinerary.Visibility.PUBLIC "
            + "AND i.id NOT IN :archivedIds "
            + "AND (i.publishedAt < :at OR (i.publishedAt = :at AND i.id < :id)) "
            + "ORDER BY i.publishedAt DESC, i.id DESC")
    List<Itinerary> findDiscoveryPageAfter(
            @Param("archivedIds") Collection<UUID> archivedIds,
            @Param("at") Instant at,
            @Param("id") UUID id,
            Limit limit);


    @Query("SELECT i FROM Itinerary i WHERE i.published = true "
            + "AND i.visibility = com.largata.itinerary.Visibility.PUBLIC "
            + "AND i.id NOT IN :archivedIds "
            + "AND i.coverImageUrl IS NOT NULL "
            + "ORDER BY i.publishedAt DESC, i.id DESC")
    List<Itinerary> findRecommendable(
            @Param("archivedIds") Collection<UUID> archivedIds, Limit limit);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE itinerary SET plan_version = plan_version + 1 WHERE id = :itineraryId",
            nativeQuery = true)
    void bumpPlanVersion(@Param("itineraryId") UUID itineraryId);


    @Query(value = "SELECT plan_version FROM itinerary WHERE id = :itineraryId FOR UPDATE",
            nativeQuery = true)
    Long lockedPlanVersion(@Param("itineraryId") UUID itineraryId);
}
