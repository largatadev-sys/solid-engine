package com.largata.trip.plan;

import com.largata.trip.plan.DayView;
import com.largata.trip.plan.TripPlanTree;
import com.largata.trip.editing.LeaseSubject;
import java.util.List;
import java.util.UUID;
import com.largata.trip.editing.LeaseHolderResponse;


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


    public static DayResponse annotated(DayView day, TripPlanTree plan) {
        return new DayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(activity -> ActivityResponse.annotated(activity, plan)).toList(),
                LeaseHolderResponse.of(plan.holderOf(LeaseSubject.day(day.id()))));
    }
}
