package com.largata.itinerary;

import com.largata.common.authz.ItineraryNotFoundException;
import com.largata.common.authz.Membership;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.repository.TripRepository;


@Component
public class PublishedVisibility {

    private final TripRepository itineraries;
    private final WorkspaceService workspaces;

    PublishedVisibility(TripRepository itineraries, WorkspaceService workspaces) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public Trip require(UUID itineraryId, Optional<Membership> caller) {
        return admitted(itineraryId, caller).orElseThrow(ItineraryNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public boolean admits(UUID itineraryId, Optional<Membership> caller) {
        return admitted(itineraryId, caller).isPresent();
    }


    private Optional<Trip> admitted(UUID itineraryId, Optional<Membership> caller) {
        return itineraries
                .findById(itineraryId)
                .filter(itinerary -> !workspaces.isArchived(itineraryId))
                .filter(PublishedVisibility::visibleTo);
    }


    private static boolean visibleTo(Trip itinerary) {
        return itinerary.isPublished();
    }
}
