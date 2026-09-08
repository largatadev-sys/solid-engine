package com.largata.trip.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface ActivityRepository extends JpaRepository<Activity, UUID> {


    List<Activity> findByDayIdOrderBySortOrderAscIdAsc(UUID dayId);

    @Query("SELECT a.id FROM Activity a, Day d WHERE d.id = a.dayId AND d.itineraryId = :itineraryId")
    List<UUID> idsUnder(@Param("itineraryId") UUID itineraryId);

    @Query(
            "SELECT a FROM Activity a, Day d WHERE d.id = a.dayId AND d.itineraryId = :itineraryId"
                    + " ORDER BY a.dayId, a.sortOrder, a.id")
    List<Activity> allUnder(@Param("itineraryId") UUID itineraryId);


    Optional<Activity> findByIdAndDayId(UUID id, UUID dayId);


    long countByDayId(UUID dayId);


    @Query("SELECT MAX(a.sortOrder) FROM Activity a WHERE a.dayId = :dayId")
    Integer findMaxSortOrder(@Param("dayId") UUID dayId);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "UPDATE Activity a SET a.costCurrency = :currency "
                    + "WHERE a.dayId IN (SELECT d.id FROM Day d WHERE d.itineraryId = :itineraryId) "
                    + "AND a.costAmount IS NOT NULL")
    int relabelPricedActivities(@Param("itineraryId") UUID itineraryId, @Param("currency") String currency);


    @Query(
            "SELECT COUNT(a) FROM Activity a "
                    + "WHERE a.dayId IN (SELECT d.id FROM Day d WHERE d.itineraryId = :itineraryId) "
                    + "AND a.costAmount IS NOT NULL")
    long countPricedActivities(@Param("itineraryId") UUID itineraryId);
}
