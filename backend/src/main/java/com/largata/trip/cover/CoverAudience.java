package com.largata.trip.cover;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import com.largata.trip.trip.adapter.TripMediaAudience;


@Component
class CoverAudience implements PhotoAudience {

    private final TripMediaAudience trips;

    CoverAudience(TripMediaAudience trips) {
        this.trips = trips;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.ITINERARY_COVER;
    }


    @Override
    public boolean mayRead(UUID itineraryId, UUID travelerId) {
        return trips.admits(itineraryId, travelerId);
    }
}
