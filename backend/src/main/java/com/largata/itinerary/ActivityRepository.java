package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface ActivityRepository extends JpaRepository<Activity, UUID> {


    List<Activity> findByDayIdOrderBySortOrderAscIdAsc(UUID dayId);


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
