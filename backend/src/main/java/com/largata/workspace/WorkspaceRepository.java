package com.largata.workspace;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The Workspace aggregate's persistence. Package-private reach by design: everything outside this
 * module goes through {@link WorkspaceService} (ADR-002).
 */
interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsByItineraryId(UUID itineraryId);
}
