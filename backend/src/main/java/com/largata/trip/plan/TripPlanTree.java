package com.largata.trip.plan;

import com.largata.identity.TravelerSummary;
import com.largata.trip.workspace.WorkspaceState;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.largata.trip.record.Trip;
import com.largata.trip.editing.LeaseSubject;
import com.largata.trip.editing.LeaseHolder;


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
