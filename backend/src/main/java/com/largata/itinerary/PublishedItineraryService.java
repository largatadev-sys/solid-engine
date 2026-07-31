package com.largata.itinerary;

import com.largata.common.authz.ItineraryNotFoundException;
import com.largata.common.authz.Membership;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.workspace.WorkspaceService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PublishedItineraryService {

    private final ItineraryRepository itineraries;
    private final DayService days;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;

    PublishedItineraryService(
            ItineraryRepository itineraries,
            DayService days,
            WorkspaceService workspaces,
            TravelerService travelers) {
        this.itineraries = itineraries;
        this.days = days;
        this.workspaces = workspaces;
        this.travelers = travelers;
    }


    @Transactional(readOnly = true)
    public PublishedItinerary publicView(UUID itineraryId) {
        Itinerary itinerary = itineraries.findById(itineraryId).orElseThrow(ItineraryNotFoundException::new);
        if (!itinerary.visibility().isPublished() || workspaces.isArchived(itineraryId)) {
            throw new ItineraryNotFoundException();
        }
        return project(itinerary);
    }


    @Transactional(readOnly = true)
    public PublishedItinerary preview(Membership owner) {
        if (!owner.isOwner()) {
            throw new NotTripOwnerException("Only the trip owner can preview the published page.");
        }
        return project(
                itineraries
                        .findById(owner.itineraryId())
                        .orElseThrow(() -> new IllegalStateException(
                                "The guard authorized a membership for an itinerary that does not exist")));
    }


    private PublishedItinerary project(Itinerary itinerary) {
        return PublishedItinerary.of(itinerary, days.plan(itinerary.id()), bylineOf(itinerary.id()));
    }


    private TravelerSummary bylineOf(UUID itineraryId) {
        UUID ownerId =
                workspaces
                        .ownerOf(itineraryId)
                        .orElseThrow(() -> new IllegalStateException(
                                "No owner for itinerary " + itineraryId + " — INV-4"));
        List<TravelerSummary> found = travelers.summariesByIds(List.of(ownerId));
        if (found.isEmpty()) {
            throw new IllegalStateException("The owner of itinerary " + itineraryId + " has no traveler record");
        }
        return found.getFirst();
    }
}
