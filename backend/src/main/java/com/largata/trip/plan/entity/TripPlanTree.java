package com.largata.trip.plan.entity;

import com.largata.identity.TravelerSummary;
import com.largata.trip.workspace.entity.WorkspaceState;
import java.util.List;
import java.util.Map;
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
        Map<UUID, TravelerSummary> editors) {


    public boolean archived() {
        return workspaceState.isArchived();
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
