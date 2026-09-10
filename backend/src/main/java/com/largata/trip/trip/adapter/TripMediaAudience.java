package com.largata.trip.trip.adapter;

import com.largata.common.authz.PublicationState;
import com.largata.common.authz.Role;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.trip.entity.Trip;


@Component
public class TripMediaAudience {

    private final TripRepository trips;
    private final WorkspaceService workspaces;
    private final PublicationState publication;

    TripMediaAudience(
            TripRepository trips, WorkspaceService workspaces, PublicationState publication) {
        this.trips = trips;
        this.workspaces = workspaces;
        this.publication = publication;
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
        return !archivedNarrowsToTheOwner(itinerary.id()) && publication.isPublished(itinerary.id());
    }


    private boolean archivedNarrowsToTheOwner(UUID itineraryId) {
        return workspaces.isArchived(itineraryId);
    }


    private boolean isOwner(UUID itineraryId, UUID travelerId) {
        return workspaces.roleOf(itineraryId, travelerId).filter(Role.OWNER::equals).isPresent();
    }
}
