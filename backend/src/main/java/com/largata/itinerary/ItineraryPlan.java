package com.largata.itinerary;

import com.largata.identity.TravelerSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public record ItineraryPlan(
        Itinerary itinerary,
        List<DayView> days,
        boolean archived,
        Map<LeaseSubject, LeaseHolder> leaseHolders,
        Map<UUID, TravelerSummary> editors) {


    public LeaseHolder holderOf(LeaseSubject subject) {
        return leaseHolders.get(subject);
    }


    public TravelerSummary editor(UUID travelerId) {
        return travelerId == null ? null : editors.get(travelerId);
    }
}
