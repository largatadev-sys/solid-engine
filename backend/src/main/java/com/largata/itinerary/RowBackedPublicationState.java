package com.largata.itinerary;

import com.largata.common.authz.PublicationState;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
class RowBackedPublicationState implements PublicationState {

    private final ItineraryRepository itineraries;

    RowBackedPublicationState(ItineraryRepository itineraries) {
        this.itineraries = itineraries;
    }

    @Override
    public boolean isPublished(UUID itineraryId) {
        return itineraries
                .findById(itineraryId)
                .map(Itinerary::isPublished)
                .orElseThrow(() -> new IllegalStateException(
                        "No itinerary " + itineraryId + " to read publication status from"));
    }
}
