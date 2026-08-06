package com.largata.itinerary;

import com.largata.common.authz.Role;
import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import com.largata.workspace.WorkspaceService;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class CoverAudience implements PhotoAudience {

    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;

    CoverAudience(ItineraryRepository itineraries, WorkspaceService workspaces) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.ITINERARY_COVER;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID itineraryId, UUID travelerId) {
        return itineraries
                .findById(itineraryId)
                .map(itinerary -> admits(itinerary, travelerId))
                .orElse(false);
    }


    private boolean admits(Itinerary itinerary, UUID travelerId) {
        boolean collaborator = workspaces.isMember(itinerary.id(), travelerId);

        if (workspaces.isArchived(itinerary.id())) {
            return workspaces.roleOf(itinerary.id(), travelerId).filter(Role.OWNER::equals).isPresent();
        }
        if (collaborator) {
            return true;
        }
        return itinerary.isPublished() && itinerary.visibility() == Visibility.PUBLIC;
    }
}
