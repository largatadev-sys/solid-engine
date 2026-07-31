package com.largata.itinerary.api;

import com.largata.itinerary.DayView;
import com.largata.itinerary.ItineraryPlan;
import com.largata.itinerary.LeaseSubject;
import java.util.List;
import java.util.UUID;


public record DayResponse(
        UUID id, int ordinal, String title, List<ActivityResponse> activities, LeaseHolderResponse lease) {

    public static DayResponse of(DayView day) {
        return new DayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(ActivityResponse::of).toList(),
                null);
    }


    static DayResponse annotated(DayView day, ItineraryPlan plan) {
        return new DayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(activity -> ActivityResponse.annotated(activity, plan)).toList(),
                LeaseHolderResponse.of(plan.holderOf(LeaseSubject.day(day.id()))));
    }
}
