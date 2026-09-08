package com.largata.trip.api;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface TripApi {

    Optional<TripFacts> factsOf(UUID tripId);

    Optional<TripDayFacts> dayFactsOf(UUID tripId, UUID dayId);

    Optional<ActivityFacts> activityFactsOf(UUID tripId, UUID activityId);

    boolean frozen(UUID tripId);

    Optional<TripPlan> planOf(UUID tripId);

    void markPublished(UUID tripId, Instant at);

    void markUnpublished(UUID tripId);
}
