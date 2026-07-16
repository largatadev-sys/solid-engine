package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * The Itinerary aggregate's persistence. Package-private reach by design: everything outside this
 * module goes through {@link ItineraryService} (ADR-002).
 */
interface ItineraryRepository extends JpaRepository<Itinerary, UUID> {

    /**
     * The list's first page. {@code ORDER BY id DESC} <em>is</em> newest-first because ids are
     * UUIDv7 (see {@code UuidV7}) — no {@code created_at} sort, no tiebreaker column, no composite
     * cursor. Served whole by {@code itinerary_owner_recent_idx}.
     */
    @Query("SELECT i FROM Itinerary i WHERE i.ownerId = :ownerId ORDER BY i.id DESC")
    List<Itinerary> findFirstPage(@Param("ownerId") UUID ownerId, Limit limit);

    /**
     * The list's subsequent pages: <strong>keyset</strong>, not offset. {@code id < cursor} seeks
     * straight to the row after the last one seen, so the cost of page 50 equals the cost of page 1,
     * and — the reason Artifact 05 chose cursors — a row inserted mid-traversal cannot shift the
     * window and make an item appear twice or vanish. OFFSET does both, silently, on exactly the
     * append-heavy lists this product is made of.
     */
    @Query("SELECT i FROM Itinerary i WHERE i.ownerId = :ownerId AND i.id < :cursor ORDER BY i.id DESC")
    List<Itinerary> findPageAfter(@Param("ownerId") UUID ownerId, @Param("cursor") UUID cursor, Limit limit);

    /**
     * Ownership, answered without loading the aggregate — this is the guard's hot path (ADR-011):
     * every read of a private itinerary runs it first.
     */
    boolean existsByIdAndOwnerId(UUID id, UUID ownerId);

    Optional<Itinerary> findByIdAndOwnerId(UUID id, UUID ownerId);
}
