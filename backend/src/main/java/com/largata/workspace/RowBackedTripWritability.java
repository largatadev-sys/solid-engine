package com.largata.workspace;

import com.largata.common.authz.TripWritability;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * S1.9's writability lookup: a trip is frozen exactly when its workspace is {@code ARCHIVED}.
 *
 * <p>The other side of the seam {@link TripWritability} describes — the same shape {@link
 * RowBackedMembershipResolver} implements for the guard, and for the same reason: the fence lives in
 * {@code common}, the fact lives here, and a direct call would point {@code common} at a module.
 *
 * <p><strong>A missing workspace fails loudly rather than answering "not frozen".</strong> That is the
 * opposite direction from {@link WorkspaceService#isArchived}, and deliberately: this answer decides
 * whether a <em>write</em> proceeds, so an ambiguous state must never be read as permission. Every
 * itinerary has a workspace (S1.1's atomic formation, V5's backfill), and the fence is only reached
 * after the guard resolved a membership — which itself required a workspace row. Reaching here with
 * none means the invariant broke, and the honest response is a 500 naming it, not a quietly permitted
 * write on a trip whose state nobody could establish.
 */
@Component
class RowBackedTripWritability implements TripWritability {

    private final WorkspaceRepository workspaces;

    RowBackedTripWritability(WorkspaceRepository workspaces) {
        this.workspaces = workspaces;
    }

    @Override
    public boolean isFrozen(UUID itineraryId) {
        return workspaces
                .findByItineraryId(itineraryId)
                .map(workspace -> workspace.state().isArchived())
                .orElseThrow(() -> new IllegalStateException(
                        "No workspace for itinerary " + itineraryId + " — invariant breach"));
    }
}
