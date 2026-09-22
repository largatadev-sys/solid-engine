package com.largata.trip.workspace.adapter;

import com.largata.trip.room.ArchiveState;
import java.util.UUID;
import org.springframework.stereotype.Component;
import com.largata.trip.workspace.repository.WorkspaceRepository;


@Component
class RowBackedArchiveState implements ArchiveState {

    private final WorkspaceRepository workspaces;

    RowBackedArchiveState(WorkspaceRepository workspaces) {
        this.workspaces = workspaces;
    }

    @Override
    public boolean isArchived(UUID itineraryId) {
        return workspaces
                .findByItineraryId(itineraryId)
                .map(workspace -> workspace.state().isArchived())
                .orElseThrow(() -> new IllegalStateException(
                        "No workspace for itinerary " + itineraryId + " — invariant breach"));
    }
}
