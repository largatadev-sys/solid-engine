package com.largata.itinerary.api;

import java.util.List;
import java.util.UUID;
import com.largata.trip.plan.service.DayView;


public record PublishedDayResponse(UUID id, int ordinal, String title, List<PublishedActivityResponse> activities) {

    static PublishedDayResponse of(DayView day) {
        return new PublishedDayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(PublishedActivityResponse::of).toList());
    }
}
