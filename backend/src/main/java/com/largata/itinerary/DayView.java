package com.largata.itinerary;

import com.largata.media.Photo;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public record DayView(UUID id, int ordinal, String title, List<ActivityView> activities) {

    static DayView of(Day day, List<Activity> activities) {
        return of(day, activities, Map.of());
    }


    static DayView of(Day day, List<Activity> activities, Map<UUID, List<Photo>> photosByActivity) {
        return new DayView(
                day.id(),
                day.ordinal(),
                day.title(),
                activities.stream()
                        .map(
                                activity ->
                                        ActivityView.of(
                                                activity,
                                                ActivityPhotoView.allOf(
                                                        photosByActivity.getOrDefault(activity.id(), List.of()))))
                        .toList());
    }
}
