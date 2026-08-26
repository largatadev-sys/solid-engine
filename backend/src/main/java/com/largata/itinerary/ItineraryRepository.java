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


    @Query("SELECT i.currency FROM Itinerary i WHERE i.id = :itineraryId")
    String findCurrency(@Param("itineraryId") UUID itineraryId);


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


    String ON_THE_STRANGERS_SURFACE = """
            i.published = true
              AND i.visibility = 'PUBLIC'
              AND i.id <> ALL (CAST(:archivedIds AS uuid[]))
            """;


    String DISCOVERABLE = ON_THE_STRANGERS_SURFACE + """
              AND (CAST(:query AS text) IS NULL
                   OR i.title ILIKE '%' || CAST(:query AS text) || '%'
                   OR i.destination ILIKE '%' || CAST(:query AS text) || '%')
              AND (CAST(:destination AS text) IS NULL
                   OR lower(trim(i.destination)) = lower(trim(CAST(:destination AS text))))
              AND (CAST(:minDays AS int) IS NULL OR i.duration_days >= CAST(:minDays AS int))
              AND (CAST(:maxDays AS int) IS NULL OR i.duration_days <= CAST(:maxDays AS int))
            """;


    @Query(value = """
            SELECT i.* FROM (
                SELECT i.*, (SELECT count(*) FROM day WHERE day.itinerary_id = i.id) AS duration_days
                FROM itinerary i
            ) i
            WHERE
            """ + DISCOVERABLE + """
              AND (CAST(:at AS timestamptz) IS NULL
                   OR i.published_at < CAST(:at AS timestamptz)
                   OR (i.published_at = CAST(:at AS timestamptz) AND i.id < CAST(:id AS uuid)))
            ORDER BY i.published_at DESC, i.id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<Itinerary> findDiscoveryPage(
            @Param("archivedIds") String archivedIds,
            @Param("query") String query,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays,
            @Param("at") Instant at,
            @Param("id") UUID id,
            @Param("pageSize") int pageSize);


    @Query(value = """
            SELECT count(*) FROM (
                SELECT i.*, (SELECT count(*) FROM day WHERE day.itinerary_id = i.id) AS duration_days
                FROM itinerary i
            ) i
            WHERE
            """ + DISCOVERABLE, nativeQuery = true)
    long countDiscoverable(
            @Param("archivedIds") String archivedIds,
            @Param("query") String query,
            @Param("destination") String destination,
            @Param("minDays") Integer minDays,
            @Param("maxDays") Integer maxDays);


    @Query(value = """
            SELECT * FROM itinerary i
            WHERE
            """ + ON_THE_STRANGERS_SURFACE + """
              AND i.cover_image_url IS NOT NULL
            ORDER BY i.published_at DESC, i.id DESC
            LIMIT :probe
            """, nativeQuery = true)
    List<Itinerary> findRecommendable(
            @Param("archivedIds") String archivedIds, @Param("probe") int probe);


    @Query(value = """
            WITH exploded AS (
                SELECT i.id,
                       i.published_at,
                       i.cover_image_url,
                       trim(i.destination) AS spelling,
                       lower(trim(i.destination)) AS grouping_key
                FROM itinerary i
                WHERE
            """ + ON_THE_STRANGERS_SURFACE + """
                  AND i.published_at >= :since
                  AND trim(i.destination) <> ''
            ),
            ranked AS (
                SELECT grouping_key,
                       spelling,
                       cover_image_url,
                       row_number() OVER (
                           PARTITION BY grouping_key ORDER BY published_at DESC, id DESC
                       ) AS recency
                FROM exploded
            ),
            tallied AS (
                SELECT grouping_key, count(DISTINCT id) AS trips
                FROM exploded
                GROUP BY grouping_key
            )
            SELECT (SELECT r.spelling FROM ranked r
                     WHERE r.grouping_key = t.grouping_key AND r.recency = 1) AS destination,
                   t.trips AS tripCount,
                   (SELECT c.cover_image_url FROM ranked c
                     WHERE c.grouping_key = t.grouping_key
                       AND c.cover_image_url IS NOT NULL
                     ORDER BY c.recency
                     LIMIT 1) AS coverImageUrl
            FROM tallied t
            ORDER BY t.trips DESC, destination ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<TrendingDestinationRow> findTrendingDestinations(
            @Param("since") Instant since,
            @Param("archivedIds") String archivedIds,
            @Param("limit") int limit);


    @Query(value = """
            SELECT DISTINCT ON (lower(trim(i.destination))) trim(i.destination)
            FROM itinerary i
            WHERE
            """ + ON_THE_STRANGERS_SURFACE + """
              AND trim(i.destination) <> ''
              AND i.destination ILIKE '%' || CAST(:query AS text) || '%'
            ORDER BY lower(trim(i.destination))
            LIMIT :limit
            """, nativeQuery = true)
    List<String> suggestDestinations(
            @Param("archivedIds") String archivedIds,
            @Param("query") String query,
            @Param("limit") int limit);


    @Query(value = """
            SELECT i.title FROM itinerary i
            WHERE
            """ + ON_THE_STRANGERS_SURFACE + """
              AND i.title ILIKE '%' || CAST(:query AS text) || '%'
            ORDER BY i.published_at DESC, i.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<String> suggestTitles(
            @Param("archivedIds") String archivedIds,
            @Param("query") String query,
            @Param("limit") int limit);


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

    @Query(value = """
            SELECT count(*) FROM itinerary i
            WHERE i.owner_id = :ownerId
              AND
            """ + ON_THE_STRANGERS_SURFACE, nativeQuery = true)
    long countOnTheStrangersSurface(
            @Param("ownerId") UUID ownerId, @Param("archivedIds") String archivedIds);


    @Query(value = """
            SELECT count(DISTINCT lower(trim(i.destination))) FROM itinerary i
            WHERE i.owner_id = :ownerId
              AND trim(i.destination) <> ''
              AND
            """ + ON_THE_STRANGERS_SURFACE, nativeQuery = true)
    long countDestinationsOnTheStrangersSurface(
            @Param("ownerId") UUID ownerId, @Param("archivedIds") String archivedIds);


    @Query(value = """
            SELECT * FROM itinerary i
            WHERE i.owner_id = :ownerId
              AND
            """ + ON_THE_STRANGERS_SURFACE + """
              AND (CAST(:cursorId AS uuid) IS NULL
                   OR i.published_at < CAST(:cursorAt AS timestamptz)
                   OR (i.published_at = CAST(:cursorAt AS timestamptz)
                       AND i.id < CAST(:cursorId AS uuid)))
            ORDER BY i.published_at DESC, i.id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<Itinerary> findStrangersSurfacePage(
            @Param("ownerId") UUID ownerId,
            @Param("archivedIds") String archivedIds,
            @Param("cursorAt") Instant cursorAt,
            @Param("cursorId") UUID cursorId,
            @Param("pageSize") int pageSize);
}
