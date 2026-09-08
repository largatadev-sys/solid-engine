package com.largata.trip.plan.service;

import com.largata.common.authz.ItineraryNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.trip.repository.TripRepository;


@Service
public class PlanVersionService {

    private final TripRepository trips;

    PlanVersionService(TripRepository trips) {
        this.trips = trips;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void bump(UUID itineraryId) {
        trips.bumpPlanVersion(itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public long bumpTo(UUID itineraryId, long committed) {
        trips.bumpPlanVersion(itineraryId);
        return committed + 1;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public long currentVersion(UUID itineraryId) {
        Long version = trips.lockedPlanVersion(itineraryId);
        if (version == null) {
            throw new ItineraryNotFoundException();
        }
        return version;
    }
}
