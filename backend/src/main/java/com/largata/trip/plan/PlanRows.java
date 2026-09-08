package com.largata.trip.plan;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
public class PlanRows {

    private final ActivityRepository activities;

    PlanRows(ActivityRepository activities) {
        this.activities = activities;
    }


    @Transactional(readOnly = true)
    public List<UUID> activityIdsUnder(UUID tripId) {
        return activities.idsUnder(tripId);
    }
}
