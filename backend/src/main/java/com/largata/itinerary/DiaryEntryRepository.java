package com.largata.itinerary;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface DiaryEntryRepository extends JpaRepository<DiaryEntry, UUID> {

    List<DiaryEntry> findByTravelerIdAndItineraryIdOrderById(
            UUID travelerId, UUID itineraryId, Limit limit);

    List<DiaryEntry> findByTravelerIdAndItineraryIdAndIdGreaterThanOrderById(
            UUID travelerId, UUID itineraryId, UUID cursor, Limit limit);

    boolean existsByTravelerIdAndActivityId(UUID travelerId, UUID activityId);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
              AND e.itineraryId IN :openable
            GROUP BY e.itineraryId
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findTripsWithEntries(
            @Param("travelerId") UUID travelerId,
            @Param("openable") Collection<UUID> openableItineraryIds,
            Limit limit);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
              AND e.itineraryId IN :openable
            GROUP BY e.itineraryId
            HAVING MAX(e.id) < :cursor
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findTripsWithEntriesBefore(
            @Param("travelerId") UUID travelerId,
            @Param("openable") Collection<UUID> openableItineraryIds,
            @Param("cursor") UUID cursor,
            Limit limit);

    Optional<DiaryEntry> findByIdAndTravelerId(UUID id, UUID travelerId);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFirstFeedPage(Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
              AND (e.sharedAt < :sharedAt OR (e.sharedAt = :sharedAt AND e.id < :id))
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFeedPageAfter(
            @Param("sharedAt") Instant sharedAt, @Param("id") UUID id, Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
              AND e.travelerId IN :authorIds
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFirstFeedPageBy(
            @Param("authorIds") Collection<UUID> authorIds, Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
              AND e.travelerId NOT IN :hiddenAuthorIds
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFirstFeedPageExcept(
            @Param("hiddenAuthorIds") Collection<UUID> hiddenAuthorIds, Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
              AND e.travelerId NOT IN :hiddenAuthorIds
              AND (e.sharedAt < :sharedAt OR (e.sharedAt = :sharedAt AND e.id < :id))
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFeedPageExceptAfter(
            @Param("hiddenAuthorIds") Collection<UUID> hiddenAuthorIds,
            @Param("sharedAt") Instant sharedAt,
            @Param("id") UUID id,
            Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.sharedAt IS NOT NULL
              AND e.travelerId IN :authorIds
              AND (e.sharedAt < :sharedAt OR (e.sharedAt = :sharedAt AND e.id < :id))
            ORDER BY e.sharedAt DESC, e.id DESC
            """)
    List<DiaryEntry> findFeedPageByAfter(
            @Param("authorIds") Collection<UUID> authorIds,
            @Param("sharedAt") Instant sharedAt,
            @Param("id") UUID id,
            Limit limit);

    @Query(
            """
            SELECT e FROM DiaryEntry e
            WHERE e.itineraryId = :itineraryId
              AND e.travelerId = :travelerId
              AND e.sharedAt IS NOT NULL
            ORDER BY e.id
            """)
    List<DiaryEntry> findSharedOfTrip(
            @Param("itineraryId") UUID itineraryId, @Param("travelerId") UUID travelerId);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
              AND e.sharedAt IS NOT NULL
            GROUP BY e.itineraryId
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findSharedTrips(@Param("travelerId") UUID travelerId, Limit limit);

    @Query(
            """
            SELECT e.itineraryId AS itineraryId, COUNT(e) AS entryCount, MAX(e.id) AS latestEntryId
            FROM DiaryEntry e
            WHERE e.travelerId = :travelerId
              AND e.sharedAt IS NOT NULL
            GROUP BY e.itineraryId
            HAVING MAX(e.id) < :cursor
            ORDER BY MAX(e.id) DESC
            """)
    List<DiaryTripRow> findSharedTripsBefore(
            @Param("travelerId") UUID travelerId, @Param("cursor") UUID cursor, Limit limit);

    interface DiaryTripRow {

        UUID getItineraryId();

        long getEntryCount();

        UUID getLatestEntryId();
    }
}
