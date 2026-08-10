package com.largata.itinerary;

import com.largata.common.authz.ItineraryNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PlanVersionService {

    private final ItineraryRepository itineraries;

    PlanVersionService(ItineraryRepository itineraries) {
        this.itineraries = itineraries;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void bump(UUID itineraryId) {
        itineraries.bumpPlanVersion(itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public long bumpFrom(UUID itineraryId, long expected) {
        long current = currentVersion(itineraryId);
        if (current != expected) {
            throw new StalePlanException(current);
        }
        itineraries.bumpPlanVersion(itineraryId);
        return current + 1;
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
