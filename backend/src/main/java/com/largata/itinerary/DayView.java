package com.largata.itinerary;

import java.util.List;
import java.util.UUID;

/**
 * A day as seen from outside the module (S1.3) — the public projection of a {@link Day} row, with its
 * activities in manual order nested inside. The plan view is a list of these (ADR-013: the plan's
 * structure is its days).
 *
 * @param activities in manual sort order (ADR-013); empty until ticket 02 gives activities their CRUD
 */
public record DayView(UUID id, int ordinal, String title, List<ActivityView> activities) {

    static DayView of(Day day, List<Activity> activities) {
        return new DayView(day.id(), day.ordinal(), day.title(), activities.stream().map(ActivityView::of).toList());
    }
}
