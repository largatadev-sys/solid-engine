package com.largata.itinerary;

import com.largata.common.authz.Role;
import com.largata.workspace.WorkspaceService;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class TripMediaAudience {

    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;

    TripMediaAudience(ItineraryRepository itineraries, WorkspaceService workspaces) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    boolean admits(UUID itineraryId, UUID travelerId) {
        return itineraries
                .findById(itineraryId)
                .map(itinerary -> admits(itinerary, travelerId))
                .orElse(false);
    }


    @Transactional(readOnly = true)
    boolean admitsToTheWorkspace(UUID itineraryId, UUID travelerId) {
        return archivedNarrowsToTheOwner(itineraryId)
                ? isOwner(itineraryId, travelerId)
                : workspaces.isMember(itineraryId, travelerId);
    }


    private boolean admits(Itinerary itinerary, UUID travelerId) {
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
