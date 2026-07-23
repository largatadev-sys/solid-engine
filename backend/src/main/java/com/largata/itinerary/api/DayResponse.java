package com.largata.itinerary.api;

import com.largata.itinerary.DayView;
import java.util.List;
import java.util.UUID;

/**
 * A day as the API shows it (S1.3), with its activities nested in manual order (ADR-013). Both the
 * embedded form under an itinerary and the shape the day-mutation endpoints return.
 */
public record DayResponse(UUID id, int ordinal, String title, List<ActivityResponse> activities) {

    public static DayResponse of(DayView day) {
        return new DayResponse(
                day.id(),
                day.ordinal(),
                day.title(),
                day.activities().stream().map(ActivityResponse::of).toList());
    }
}
