package com.largata.itinerary.repository;

import com.largata.itinerary.entity.ItineraryObject;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItineraryDiscoveryRepository extends JpaRepository<ItineraryObject, UUID> {

    String DISCOVERABLE = """
            o.retired = false
              AND o.trip_id <> ALL (CAST(:excludedTripIds AS uuid[]))
              AND o.owner_id <> ALL (CAST(:excludedOwnerIds AS uuid[]))
              AND EXISTS (SELECT 1 FROM traveler t WHERE t.id = o.owner_id)
              AND (CAST(:text AS text) IS NULL
                   OR o.title ILIKE '%' || CAST(:text AS text) || '%'
                   OR o.destination ILIKE '%' || CAST(:text AS text) || '%')
              AND (CAST(:destination AS text) IS NULL
                   OR lower(trim(o.destination)) = lower(trim(CAST(:destination AS text))))
              AND (CAST(:minDays AS int) IS NULL OR o.duration_days >= CAST(:minDays AS int))
              AND (CAST(:maxDays AS int) IS NULL OR o.duration_days <= CAST(:maxDays AS int))
            """;


    @Query(value = """
            SELECT o.* FROM itinerary_object o
            WHERE
            """ + DISCOVERABLE + """
              AND (CAST(:at AS timestamptz) IS NULL
                   OR o.published_at < CAST(:at AS timestamptz)
                   OR (o.published_at = CAST(:at AS timestamptz) AND o.id < CAST(:id AS uuid)))
            ORDER BY o.published_at DESC, o.id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<ItineraryObject> findDiscoveryPage(
            @Param("excludedTripIds") String excludedTripIds,
            @Param("excludedOwnerIds") String excludedOwnerIds,
            @Param("text") String text,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays,
            @Param("at") Instant at,
            @Param("id") UUID id,
            @Param("pageSize") int pageSize);


    @Query(value = """
            SELECT count(*) FROM itinerary_object o
            WHERE
            """ + DISCOVERABLE, nativeQuery = true)
    long countDiscoverable(
            @Param("excludedTripIds") String excludedTripIds,
            @Param("excludedOwnerIds") String excludedOwnerIds,
            @Param("text") String text,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays);


    @Query(value = """
            SELECT max(trim(o.destination)) FROM itinerary_object o
            WHERE
            """ + DISCOVERABLE + """
              AND trim(coalesce(o.destination, '')) <> ''
              AND (CAST(:text AS text) IS NULL
                   OR o.destination ILIKE '%' || CAST(:text AS text) || '%')
              AND o.published_at >= CAST(:since AS timestamptz)
            GROUP BY lower(trim(o.destination))
            ORDER BY count(*) DESC, max(trim(o.destination))
            LIMIT :pageSize
            """, nativeQuery = true)
    List<String> findTrendingDestinations(
            @Param("excludedTripIds") String excludedTripIds,
            @Param("excludedOwnerIds") String excludedOwnerIds,
            @Param("text") String text,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays,
            @Param("since") Instant since,
            @Param("pageSize") int pageSize);


    @Query(value = """
            SELECT DISTINCT o.title FROM itinerary_object o
            WHERE
            """ + DISCOVERABLE + """
              AND trim(coalesce(o.title, '')) <> ''
              AND (CAST(:text AS text) IS NULL
                   OR o.title ILIKE '%' || CAST(:text AS text) || '%')
            ORDER BY o.title
            LIMIT :pageSize
            """, nativeQuery = true)
    List<String> findMatchingTitles(
            @Param("excludedTripIds") String excludedTripIds,
            @Param("excludedOwnerIds") String excludedOwnerIds,
            @Param("text") String text,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays,
            @Param("pageSize") int pageSize);


    String OWNED_AND_LIVE = """
            o.retired = false
              AND o.owner_id = CAST(:ownerId AS uuid)
              AND o.trip_id <> ALL (CAST(:excludedTripIds AS uuid[]))
            """;


    @Query(value = """
            SELECT o.* FROM itinerary_object o
            WHERE
            """ + OWNED_AND_LIVE + """
            ORDER BY o.published_at DESC, o.id DESC
            """, nativeQuery = true)
    List<ItineraryObject> findOwnedBy(
            @Param("ownerId") UUID ownerId, @Param("excludedTripIds") String excludedTripIds);


    @Query(value = """
            SELECT count(*) FROM itinerary_object o
            WHERE
            """ + OWNED_AND_LIVE, nativeQuery = true)
    long countOwnedBy(
            @Param("ownerId") UUID ownerId, @Param("excludedTripIds") String excludedTripIds);


    @Query(value = """
            SELECT count(DISTINCT lower(trim(o.destination))) FROM itinerary_object o
            WHERE
            """ + OWNED_AND_LIVE + """
              AND trim(coalesce(o.destination, '')) <> ''
            """, nativeQuery = true)
    long countDestinationsOwnedBy(
            @Param("ownerId") UUID ownerId, @Param("excludedTripIds") String excludedTripIds);


    @Query(value = """
            SELECT o.* FROM itinerary_object o
            WHERE
            """ + OWNED_AND_LIVE + """
              AND (CAST(:at AS timestamptz) IS NULL
                   OR o.published_at < CAST(:at AS timestamptz)
                   OR (o.published_at = CAST(:at AS timestamptz) AND o.id < CAST(:id AS uuid)))
            ORDER BY o.published_at DESC, o.id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<ItineraryObject> findOwnedPage(
            @Param("ownerId") UUID ownerId,
            @Param("excludedTripIds") String excludedTripIds,
            @Param("at") Instant at,
            @Param("id") UUID id,
            @Param("pageSize") int pageSize);
}
