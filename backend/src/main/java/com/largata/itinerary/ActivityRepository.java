package com.largata.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface ActivityRepository extends JpaRepository<Activity, UUID> {


    List<Activity> findByDayIdOrderBySortOrderAscIdAsc(UUID dayId);


    Optional<Activity> findByIdAndDayId(UUID id, UUID dayId);


    long countByDayId(UUID dayId);


    @Query("SELECT MAX(a.sortOrder) FROM Activity a WHERE a.dayId = :dayId")
    Integer findMaxSortOrder(@Param("dayId") UUID dayId);
}
