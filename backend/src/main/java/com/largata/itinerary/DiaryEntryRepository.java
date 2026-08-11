package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface DiaryEntryRepository extends JpaRepository<DiaryEntry, UUID> {

    List<DiaryEntry> findByTravelerIdAndItineraryIdOrderById(UUID travelerId, UUID itineraryId);

    boolean existsByTravelerIdAndActivityId(UUID travelerId, UUID activityId);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
            GROUP BY e.itineraryId
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findTripsWithEntries(@Param("travelerId") UUID travelerId, Limit limit);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
            GROUP BY e.itineraryId
            HAVING MAX(e.id) < :cursor
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findTripsWithEntriesBefore(
            @Param("travelerId") UUID travelerId, @Param("cursor") UUID cursor, Limit limit);

    Optional<DiaryEntry> findByIdAndTravelerId(UUID id, UUID travelerId);


    interface DiaryTripRow {

        UUID getItineraryId();

        long getEntryCount();

        UUID getLatestEntryId();
    }
}
