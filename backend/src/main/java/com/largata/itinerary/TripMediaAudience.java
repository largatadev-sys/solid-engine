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


    private boolean admits(Itinerary itinerary, UUID travelerId) {
        if (workspaces.isArchived(itinerary.id())) {
            return workspaces.roleOf(itinerary.id(), travelerId).filter(Role.OWNER::equals).isPresent();
        }
        if (workspaces.isMember(itinerary.id(), travelerId)) {
            return true;
        }
        return itinerary.isPublished() && itinerary.visibility() == Visibility.PUBLIC;
    }
}
