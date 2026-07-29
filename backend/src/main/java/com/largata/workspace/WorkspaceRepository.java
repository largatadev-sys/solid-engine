package com.largata.workspace;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsByItineraryId(UUID itineraryId);


    Optional<Workspace> findByItineraryId(UUID itineraryId);
}
