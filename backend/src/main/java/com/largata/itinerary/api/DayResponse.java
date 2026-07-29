package com.largata.itinerary.api;

import com.largata.itinerary.DayView;
import java.util.List;
import java.util.UUID;


public record DayResponse(UUID id, int ordinal, String title, List<ActivityResponse> activities) {

    public static DayResponse of(DayView day) {
        return new DayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(ActivityResponse::of).toList());
    }
}
