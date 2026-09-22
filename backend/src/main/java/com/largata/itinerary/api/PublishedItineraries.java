package com.largata.itinerary.api;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;


public interface PublishedItineraries {


    Set<UUID> publishedAmong(Collection<UUID> tripIds);


    Map<UUID, LiveItinerary> liveAmong(Collection<UUID> tripIds);


    record LiveItinerary(UUID itineraryId, Instant publishedAt) {}
}
