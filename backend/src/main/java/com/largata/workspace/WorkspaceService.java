package com.largata.workspace;

import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The workspace module's one entry point (ADR-002: modules are reached by service interface, never
 * by another module's tables).
 *
 * <p>S1.1 gives it exactly one method. The member-facing surface — invite, accept, remove, leave,
 * transfer ownership — arrives with the stories that own it (S1.2, S1.5, S1.6).
 */
@Service
public class WorkspaceService {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceService.class);

    private final WorkspaceRepository workspaces;

    WorkspaceService(WorkspaceRepository workspaces) {
        this.workspaces = workspaces;
    }

    /**
     * Opens the workspace around a newly-created itinerary, with its creator as {@code OWNER}.
     *
     * <p><strong>{@link Propagation#MANDATORY}, and that is the method's most important line.</strong>
     * Artifact 03 requires that no ownerless window ever exists — the workspace and its owner
     * membership must commit with the itinerary or not at all. {@code MANDATORY} makes that a
     * property the caller <em>cannot get wrong</em>: called outside a transaction it throws rather
     * than quietly opening its own and committing independently of an itinerary that may still roll
     * back. {@code REQUIRED} (the default) would have been the silent version of this bug — and
     * silence is what this codebase keeps paying for (S0.2's {@code getTokens()}, S0.4's inlining).
     *
     * <p>No {@code Membership} parameter and no guard call, deliberately: this is the act that
     * <em>establishes</em> membership. There is nothing to authorize against until it returns —
     * exactly the reasoning {@code ItineraryService.create} records for the same absence.
     *
     * @param formedAt the itinerary's creation instant — see {@link Workspace#formAround}
     * @throws org.springframework.transaction.IllegalTransactionStateException if called without an
     *     active transaction
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void formAround(UUID itineraryId, UUID ownerTravelerId, Instant formedAt) {
        Workspace workspace = workspaces.save(Workspace.formAround(itineraryId, ownerTravelerId, formedAt));
        // Ids only, never a title (P3). One line, on the operation that opens the walls.
        log.info(
                "Workspace formed: id={} itineraryId={} ownerId={}",
                workspace.id(),
                itineraryId,
                ownerTravelerId);
    }
}
