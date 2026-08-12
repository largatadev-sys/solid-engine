package com.largata.itinerary;

import java.time.LocalTime;


record ActivitySnapshot(String activityTitle, String dayLabel, LocalTime timeOfDay, String place) {

    ActivitySnapshot {
        if (activityTitle == null || activityTitle.isBlank()) {
            throw new IllegalArgumentException("A snapshot records the activity's title");
        }
        if (dayLabel == null || dayLabel.isBlank()) {
            throw new IllegalArgumentException("A snapshot records the day it happened on");
        }
        place = place == null || place.isBlank() ? null : place.strip();
    }


    static ActivitySnapshot of(Activity activity, Day day) {
        return new ActivitySnapshot(
                activity.title(), labelOf(day), activity.timeOfDay(), activity.place());
    }


    private static String labelOf(Day day) {
        String prefix = "Day " + day.ordinal();
        String title = day.title();
        return title == null || title.isBlank() ? prefix : prefix + ": " + title.strip();
    }
}
