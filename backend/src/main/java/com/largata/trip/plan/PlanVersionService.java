package com.largata.trip.plan;

import com.largata.common.authz.ItineraryNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.record.TripRepository;


@Service
public class PlanVersionService {

    private final TripRepository itineraries;

    PlanVersionService(TripRepository itineraries) {
        this.itineraries = itineraries;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void bump(UUID itineraryId) {
        itineraries.bumpPlanVersion(itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public long bumpTo(UUID itineraryId, long committed) {
        itineraries.bumpPlanVersion(itineraryId);
        return committed + 1;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public long currentVersion(UUID itineraryId) {
        Long version = itineraries.lockedPlanVersion(itineraryId);
        if (version == null) {
            throw new ItineraryNotFoundException();
        }
        return version;
    }
}
