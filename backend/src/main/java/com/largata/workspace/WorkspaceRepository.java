package com.largata.workspace;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The Workspace aggregate's persistence. Package-private reach by design: everything outside this
 * module goes through {@link WorkspaceService} (ADR-002).
 */
interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsByItineraryId(UUID itineraryId);

    /**
     * The workspace around one itinerary — the entry point for S1.2's member admission and the
     * itinerary→workspace id resolution the invitation surface needs. The 1:1 (V4's UNIQUE) makes at
     * most one.
     */
    Optional<Workspace> findByItineraryId(UUID itineraryId);
}
