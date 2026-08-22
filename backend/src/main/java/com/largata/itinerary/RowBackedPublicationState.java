package com.largata.itinerary;

import com.largata.common.authz.PublicationState;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
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

    @Override
    public Set<UUID> publishedAmong(Collection<UUID> itineraryIds) {
        if (itineraryIds.isEmpty()) {
            return Set.of();
        }
        return StreamSupport.stream(itineraries.findAllById(itineraryIds).spliterator(), false)
                .filter(Itinerary::isPublished)
                .map(Itinerary::id)
                .collect(Collectors.toUnmodifiableSet());
    }
}
