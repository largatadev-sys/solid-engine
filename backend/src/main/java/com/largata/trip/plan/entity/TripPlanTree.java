package com.largata.trip.plan.entity;

import com.largata.common.authz.PublicationState;
import com.largata.identity.TravelerSummary;
import com.largata.trip.workspace.entity.WorkspaceState;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.editing.entity.LeaseHolder;
import com.largata.trip.plan.service.DayView;


public record TripPlanTree(
        Trip itinerary,
        List<DayView> days,
        WorkspaceState workspaceState,
        Map<LeaseSubject, LeaseHolder> leaseHolders,
        Map<UUID, TravelerSummary> editors,
        Optional<PublicationState.LivePublication> publication) {


    public boolean archived() {
        return workspaceState.isArchived();
    }


    public boolean published() {
        return publication.isPresent();
    }


    public UUID itineraryId() {
        return publication.map(PublicationState.LivePublication::itineraryId).orElse(null);
    }


    public Instant publishedAt() {
        return publication.map(PublicationState.LivePublication::publishedAt).orElse(null);
    }


    public LeaseHolder holderOf(LeaseSubject subject) {
        return leaseHolders.get(subject);
    }


    public boolean hasLiveLease() {
        return !leaseHolders.isEmpty();
    }


    public TravelerSummary editor(UUID travelerId) {
        return travelerId == null ? null : editors.get(travelerId);
    }
}
