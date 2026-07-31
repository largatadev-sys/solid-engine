package com.largata.itinerary;

import com.largata.identity.TravelerSummary;
import com.largata.workspace.WorkspaceState;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public record ItineraryPlan(
        Itinerary itinerary,
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


    public TravelerSummary editor(UUID travelerId) {
        return travelerId == null ? null : editors.get(travelerId);
    }
}
