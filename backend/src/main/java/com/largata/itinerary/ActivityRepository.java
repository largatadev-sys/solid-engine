package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * The Activity child's persistence, package-private (ADR-002).
 */
interface ActivityRepository extends JpaRepository<Activity, UUID> {

    /**
     * A day's activities, in manual order, ties broken by id (creation order) so the list is
     * deterministic even mid-reorder — matching {@code activity_day_order_idx} plus the id tiebreak
     * ADR-013 records.
     */
    List<Activity> findByDayIdOrderBySortOrderAscIdAsc(UUID dayId);

    /** One activity, scoped to its day: the id must belong to the day the guard's chain authorized. */
    Optional<Activity> findByIdAndDayId(UUID id, UUID dayId);

    /** How many activities a day holds — the cap check, without reading the rows. */
    long countByDayId(UUID dayId);

    /**
     * The highest sort order currently on a day, or {@code null} if the day is empty — the position a
     * new activity appends after (max + 1). A single aggregate query, not a full read: create does not
     * need the rows, only where the end is.
     */
    @Query("SELECT MAX(a.sortOrder) FROM Activity a WHERE a.dayId = :dayId")
    Integer findMaxSortOrder(@Param("dayId") UUID dayId);
}
