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
     * The guard-authorized read (see {@link ItineraryService#view}) — by {@code (id, ownerId)}
     * rather than id alone, so even a mistakenly-constructed membership cannot widen what comes back.
     *
     * <p>Its sibling {@code existsByIdAndOwnerId} lived here until S1.1 and is gone with that story:
     * it existed for S0.3's owner-based resolver, and the guard's hot path is now {@code
     * MembershipRepository.findRole} in the workspace module (ADR-011's swap).
     */
    Optional<Itinerary> findByIdAndOwnerId(UUID id, UUID ownerId);
}
