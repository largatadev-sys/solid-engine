package com.largata.itinerary;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
class PhotoDumpAudience implements PhotoAudience {

    private final TripMediaAudience trips;

    PhotoDumpAudience(TripMediaAudience trips) {
        this.trips = trips;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.ITINERARY_PHOTO_DUMP;
    }


    @Override
    public boolean mayRead(UUID itineraryId, UUID travelerId) {
        return trips.admitsToTheWorkspace(itineraryId, travelerId);
    }
}
