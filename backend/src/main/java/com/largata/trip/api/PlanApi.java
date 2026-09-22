package com.largata.trip.api;

import com.largata.trip.room.Membership;
import java.util.Optional;
import java.util.UUID;

public interface PlanApi {

    Optional<TripPlan> planOf(UUID tripId);

    Optional<TripDayFacts> dayFactsOf(UUID tripId, UUID dayId);

    Optional<ActivityFacts> activityFactsOf(UUID tripId, UUID activityId);

    Optional<String> planHeldByAnotherTraveler(Membership member);
}
