package com.largata.itinerary;

import java.util.List;
import java.util.UUID;


public record DayView(UUID id, int ordinal, String title, List<ActivityView> activities) {

    static DayView of(Day day, List<Activity> activities) {
        return new DayView(day.id(), day.ordinal(), day.title(), activities.stream().map(ActivityView::of).toList());
    }
}
