package com.largata.trip.record;

import com.largata.trip.api.TripLifecycle;
import com.largata.trip.api.TripPlan;
import com.largata.trip.exception.TripNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TripPlanHeaders {

    private final ItineraryRepository itineraries;

    TripPlanHeaders(ItineraryRepository itineraries) {
        this.itineraries = itineraries;
    }


    @Transactional(readOnly = true)
    public Optional<TripPlan> headerOf(UUID tripId) {
        return itineraries.findById(tripId).map(TripPlanHeaders::headerFrom);
    }


    private static TripPlan headerFrom(Itinerary trip) {
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
                TripLifecycle.parse(trip.state().name()).orElseThrow(TripNotFoundException::new),
                trip.isPublished(),
                List.of());
    }
}
