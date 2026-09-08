package com.largata.trip.plan.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.plan.repository.ActivityRepository;


@Component
public class PlanRows {

    private final ActivityRepository activities;

    PlanRows(ActivityRepository activities) {
        this.activities = activities;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public List<UUID> activityIdsUnder(UUID tripId) {
        return activities.idsUnder(tripId);
    }
}
