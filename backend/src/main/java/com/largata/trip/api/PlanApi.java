package com.largata.trip.api;

import java.util.Optional;
import java.util.UUID;

public interface PlanApi {

    Optional<TripPlan> planOf(UUID tripId);

    Optional<TripDayFacts> dayFactsOf(UUID tripId, UUID dayId);

    Optional<ActivityFacts> activityFactsOf(UUID tripId, UUID activityId);
}
