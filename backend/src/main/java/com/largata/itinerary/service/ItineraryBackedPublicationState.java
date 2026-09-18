package com.largata.itinerary.service;

import com.largata.itinerary.api.PublishedItineraries;
import com.largata.itinerary.entity.ItineraryObject;
import com.largata.itinerary.repository.ItineraryObjectRepository;
import com.largata.trip.api.PublicationState;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class ItineraryBackedPublicationState implements PublicationState, PublishedItineraries {

    private final ItineraryObjectRepository objects;

    ItineraryBackedPublicationState(ItineraryObjectRepository objects) {
        this.objects = objects;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean isPublished(UUID tripId) {
        return live(tripId).isPresent();
    }


    @Override
    @Transactional(readOnly = true)
    public Set<UUID> publishedAmong(Collection<UUID> tripIds) {
        if (tripIds.isEmpty()) {
            return Set.of();
        }
        return objects.findLiveByTripIdIn(tripIds).stream()
                .map(ItineraryObject::tripId)
                .collect(Collectors.toUnmodifiableSet());
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<PublicationState.LivePublication> liveFor(UUID tripId) {
        return live(tripId)
                .map(object -> new PublicationState.LivePublication(object.id(), object.publishedAt()));
    }


    @Override
    @Transactional(readOnly = true)
    public Map<UUID, LiveItinerary> liveAmong(Collection<UUID> tripIds) {
        if (tripIds.isEmpty()) {
            return Map.of();
        }
        return objects.findLiveByTripIdIn(tripIds).stream()
                .collect(
                        Collectors.toUnmodifiableMap(
                                ItineraryObject::tripId,
                                object -> new LiveItinerary(object.id(), object.publishedAt())));
    }


    private Optional<ItineraryObject> live(UUID tripId) {
        return objects.findByTripId(tripId).filter(candidate -> !candidate.isRetired());
    }
}
