package com.largata.itinerary;

import com.largata.common.authz.Membership;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.fork.ForkService;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.trip.exception.NotTripOwnerException;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.plan.service.DayService;


@Service
public class PublishedItineraryService {

    private final TripRepository itineraries;
    private final DayService days;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final PublishedVisibility visibility;
    private final ForkService forks;

    PublishedItineraryService(
            TripRepository itineraries,
            DayService days,
            WorkspaceService workspaces,
            TravelerService travelers,
            PublishedVisibility visibility,
            ForkService forks) {
        this.itineraries = itineraries;
        this.days = days;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.visibility = visibility;
        this.forks = forks;
    }


    @Transactional(readOnly = true)
    public PublishedItinerary view(UUID itineraryId, Optional<Membership> caller, UUID readerId) {
        return project(visibility.require(itineraryId, caller), readerId);
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
                                "The guard authorized a membership for an itinerary that does not exist")),
                owner.travelerId());
    }


    private PublishedItinerary project(Trip itinerary, UUID readerId) {
        return PublishedItinerary.of(
                itinerary,
                days.plan(itinerary.id()),
                bylineOf(itinerary.id()),
                forks.forkCountOf(itinerary.id()),
                forks.provenanceOf(itinerary.id(), readerId).orElse(null));
    }


    private TravelerSummary bylineOf(UUID itineraryId) {
        UUID ownerId =
                workspaces
                        .ownerOf(itineraryId)
                        .orElseThrow(() -> new IllegalStateException(
                                "No owner for itinerary " + itineraryId + " — INV-4"));
        return travelers
                .summaryById(ownerId)
                .orElseThrow(() -> new IllegalStateException(
                        "The owner of itinerary " + itineraryId + " has no traveler record"));
    }
}
