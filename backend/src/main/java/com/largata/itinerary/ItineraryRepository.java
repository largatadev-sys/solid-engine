package com.largata.itinerary;

import java.util.Collection;
import java.util.List;
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
     * The list's first page, over the trips the caller is a member of (S1.6, ticket 03).
     *
     * <p>{@code ORDER BY id DESC} <em>is</em> newest-first because ids are UUIDv7 (see {@code UuidV7})
     * — no {@code created_at} sort, no tiebreaker column, no composite cursor.
     *
     * <p><strong>{@code IN (:itineraryIds)} replaced {@code WHERE i.ownerId = ?} at S1.6</strong>, and
     * the ids come from the workspace module rather than a join: the itinerary module must not read a
     * membership table (ADR-002). The owner-scoped predicate was the S1.5 bug — a joined trip was
     * structurally absent from its own member's list — and it would have become acute at transfer,
     * where the former owner would have lost a trip they are still on.
     *
     * <p>An empty id collection never reaches here: {@code listMine} short-circuits, because {@code IN
     * ()} is a syntax error in SQL and an always-false predicate in JPQL — the kind of difference that
     * shows up as an obscure failure rather than an empty page.
     */
    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds ORDER BY i.id DESC")
    List<Itinerary> findFirstPage(@Param("itineraryIds") Collection<UUID> itineraryIds, Limit limit);

    /**
     * The list's subsequent pages: <strong>keyset</strong>, not offset. {@code id < cursor} seeks
     * straight to the row after the last one seen, so the cost of page 50 equals the cost of page 1,
     * and — the reason Artifact 05 chose cursors — a row inserted mid-traversal cannot shift the
     * window and make an item appear twice or vanish. OFFSET does both, silently, on exactly the
     * append-heavy lists this product is made of.
     *
     * <p>The keyset property survives the S1.6 rescope unchanged: the cursor is still an itinerary id
     * and the order is still id-descending, so the same "seek past the last row seen" semantics hold.
     * Only the membership predicate widened.
     */
    @Query("SELECT i FROM Itinerary i WHERE i.id IN :itineraryIds AND i.id < :cursor ORDER BY i.id DESC")
    List<Itinerary> findPageAfter(
            @Param("itineraryIds") Collection<UUID> itineraryIds, @Param("cursor") UUID cursor, Limit limit);

    // The guard-authorized read is now {@link JpaRepository#findById}: once S1.2 admits members, the
    // authority is the guard's Membership, not itinerary ownership, so a by-(id, ownerId) read would
    // wrongly exclude members (see ItineraryService#view). The owner-scoped finder that used to live
    // here (findByIdAndOwnerId) went with that change, as existsByIdAndOwnerId went at S1.1.
}
