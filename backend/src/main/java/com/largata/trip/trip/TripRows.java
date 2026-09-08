package com.largata.trip.trip;

import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
public class TripRows {

    private final TripRepository trips;

    TripRows(TripRepository trips) {
        this.trips = trips;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void delete(UUID tripId) {
        trips.deleteById(tripId);
    }
}
