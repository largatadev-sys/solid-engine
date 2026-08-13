package com.largata.workspace;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsByItineraryId(UUID itineraryId);


    Optional<Workspace> findByItineraryId(UUID itineraryId);


    @Query(
            """
            SELECT w.itineraryId FROM Workspace w
            WHERE w.itineraryId IN :itineraryIds
              AND w.state = com.largata.workspace.WorkspaceState.ARCHIVED
            """)
    List<UUID> archivedAmong(@Param("itineraryIds") Collection<UUID> itineraryIds);
}
