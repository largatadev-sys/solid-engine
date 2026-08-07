package com.largata.itinerary;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class ActivityPhotoAudience implements PhotoAudience {

    private final ActivityRepository activities;
    private final DayRepository days;
    private final TripMediaAudience trips;

    ActivityPhotoAudience(
            ActivityRepository activities, DayRepository days, TripMediaAudience trips) {
        this.activities = activities;
        this.days = days;
        this.trips = trips;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.ACTIVITY;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID activityId, UUID travelerId) {
        return activities
                .findById(activityId)
                .flatMap(activity -> days.findById(activity.dayId()))
                .map(day -> trips.admits(day.itineraryId(), travelerId))
                .orElse(false);
    }
}
