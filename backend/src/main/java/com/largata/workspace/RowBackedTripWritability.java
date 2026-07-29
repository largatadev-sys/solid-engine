package com.largata.workspace;

import com.largata.common.authz.TripWritability;
import java.util.UUID;
import org.springframework.stereotype.Component;


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
