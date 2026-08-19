package com.largata.itinerary;

import com.largata.common.authz.ItineraryNotFoundException;
import com.largata.common.authz.Membership;
import com.largata.workspace.WorkspaceService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
public class PublishedVisibility {

    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;

    PublishedVisibility(ItineraryRepository itineraries, WorkspaceService workspaces) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public Itinerary require(UUID itineraryId, Optional<Membership> caller) {
        return admitted(itineraryId, caller).orElseThrow(ItineraryNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public boolean admits(UUID itineraryId, Optional<Membership> caller) {
        return admitted(itineraryId, caller).isPresent();
    }


    private Optional<Itinerary> admitted(UUID itineraryId, Optional<Membership> caller) {
        return itineraries
                .findById(itineraryId)
                .filter(itinerary -> !workspaces.isArchived(itineraryId))
                .filter(itinerary -> visibleTo(itinerary, caller));
    }


    private static boolean visibleTo(Itinerary itinerary, Optional<Membership> caller) {
        if (!itinerary.isPublished()) {
            return false;
        }
        return switch (itinerary.visibility()) {
            case PUBLIC -> true;
            case PRIVATE -> caller.isPresent();
        };
    }
}
