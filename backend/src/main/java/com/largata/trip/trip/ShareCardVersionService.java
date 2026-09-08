package com.largata.trip.trip;

import com.largata.common.authz.ItineraryNotFoundException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ShareCardVersionService {

    private final TripRepository trips;

    ShareCardVersionService(TripRepository trips) {
        this.trips = trips;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public Trip bumpAndReload(UUID itineraryId) {
        trips.bumpShareCardVersion(itineraryId);
        return trips.findById(itineraryId).orElseThrow(ItineraryNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public long currentVersion(UUID itineraryId) {
        Long version = trips.shareCardVersionOf(itineraryId);
        if (version == null) {
            throw new ItineraryNotFoundException();
        }
        return version;
    }


    public record CardInputs(String title, String destination, LocalDate startDate, LocalDate endDate) {

        public static CardInputs of(Trip itinerary) {
            return new CardInputs(
                    itinerary.title(),
                    itinerary.destination(),
                    itinerary.startDate(),
                    itinerary.endDate());
        }
    }
}
