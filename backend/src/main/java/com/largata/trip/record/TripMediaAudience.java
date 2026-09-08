package com.largata.trip.record;

import com.largata.common.authz.Role;
import com.largata.trip.workspace.WorkspaceService;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
public class TripMediaAudience {

    private final TripRepository trips;
    private final WorkspaceService workspaces;

    TripMediaAudience(TripRepository trips, WorkspaceService workspaces) {
        this.trips = trips;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public boolean admits(UUID itineraryId, UUID travelerId) {
        return trips
                .findById(itineraryId)
                .map(itinerary -> admits(itinerary, travelerId))
                .orElse(false);
    }


    @Transactional(readOnly = true)
    public boolean admitsToTheWorkspace(UUID itineraryId, UUID travelerId) {
        return archivedNarrowsToTheOwner(itineraryId)
                ? isOwner(itineraryId, travelerId)
                : workspaces.isMember(itineraryId, travelerId);
    }


    private boolean admits(Trip itinerary, UUID travelerId) {
        if (admitsToTheWorkspace(itinerary.id(), travelerId)) {
            return true;
        }
        return !archivedNarrowsToTheOwner(itinerary.id()) && itinerary.isPublished();
    }


    private boolean archivedNarrowsToTheOwner(UUID itineraryId) {
        return workspaces.isArchived(itineraryId);
    }


    private boolean isOwner(UUID itineraryId, UUID travelerId) {
        return workspaces.roleOf(itineraryId, travelerId).filter(Role.OWNER::equals).isPresent();
    }
}
