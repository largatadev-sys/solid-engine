package com.largata.trip.workspace.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.largata.trip.workspace.entity.Workspace;


public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsByItineraryId(UUID itineraryId);


    Optional<Workspace> findByItineraryId(UUID itineraryId);


    @Query(
            """
            SELECT w.itineraryId FROM Workspace w
            WHERE w.itineraryId IN :itineraryIds
              AND w.state = com.largata.trip.workspace.entity.WorkspaceState.ARCHIVED
            """)
    List<UUID> archivedAmong(@Param("itineraryIds") Collection<UUID> itineraryIds);


    @Query(
            """
            SELECT w.itineraryId FROM Workspace w
            WHERE w.state = com.largata.trip.workspace.entity.WorkspaceState.ARCHIVED
            """)
    List<UUID> allArchivedItineraryIds();
}
