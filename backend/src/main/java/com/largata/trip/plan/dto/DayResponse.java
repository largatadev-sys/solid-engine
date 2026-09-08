package com.largata.trip.plan.dto;

import com.largata.trip.plan.entity.TripPlanTree;
import com.largata.trip.editing.entity.LeaseSubject;
import java.util.List;
import java.util.UUID;
import com.largata.trip.editing.dto.LeaseHolderResponse;
import com.largata.trip.plan.service.DayView;


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
