package com.largata.publication.api;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ItineraryDiscoveryApi {

    List<DiscoverableItinerary> page(DiscoveryQuery query, Instant beforeAt, UUID beforeId, int limit);

    long count(DiscoveryQuery query);

    List<DiscoverableItinerary> mostRecent(DiscoveryQuery query, int limit);

    List<String> destinationsPublishedSince(DiscoveryQuery query, Instant since, int limit);

    List<String> titlesMatching(DiscoveryQuery query, int limit);

    List<DiscoverableItinerary> ownedBy(UUID ownerId, Collection<UUID> excludedTripIds);

    long countOwnedBy(UUID ownerId, Collection<UUID> excludedTripIds);

    long countDestinationsOwnedBy(UUID ownerId, Collection<UUID> excludedTripIds);

    List<DiscoverableItinerary> ownedPage(
            UUID ownerId, Collection<UUID> excludedTripIds, Instant beforeAt, UUID beforeId, int limit);


    record DiscoveryQuery(
            String text,
            String destination,
            Integer minDays,
            Integer maxDays,
            Collection<UUID> excludedTripIds,
            Collection<UUID> excludedOwnerIds) {}


    record DiscoverableItinerary(
            UUID id,
            UUID tripId,
            UUID ownerId,
            String title,
            String destination,
            Integer durationDays,
            String coverImageUrl,
            Instant publishedAt) {}
}
