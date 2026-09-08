package com.largata.trip.trip;

import com.largata.trip.api.TripPlan;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TripPlanHeaders {

    private final TripRepository trips;

    TripPlanHeaders(TripRepository trips) {
        this.trips = trips;
    }


    @Transactional(readOnly = true)
    public Optional<TripPlan> headerOf(UUID tripId) {
        return trips.findById(tripId).map(TripPlanHeaders::headerFrom);
    }


    private static TripPlan headerFrom(Trip trip) {
        return new TripPlan(
                trip.id(),
                trip.ownerId(),
                trip.title(),
                trip.destination(),
                trip.description(),
                trip.currency(),
                trip.standouts(),
                trip.bestTimeOfYear(),
                trip.coverImageUrl(),
                trip.startDate(),
                trip.endDate(),
                trip.state(),
                trip.isPublished(),
                List.of());
    }
}
