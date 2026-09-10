package com.largata.itinerary.service;

import com.largata.itinerary.api.ItineraryDiscoveryApi;
import com.largata.itinerary.entity.ItineraryObject;
import com.largata.itinerary.repository.ItineraryDiscoveryRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
class ItineraryDiscoveryService implements ItineraryDiscoveryApi {

    private final ItineraryDiscoveryRepository itineraries;

    ItineraryDiscoveryService(ItineraryDiscoveryRepository itineraries) {
        this.itineraries = itineraries;
    }


    @Override
    @Transactional(readOnly = true)
    public List<DiscoverableItinerary> page(
            DiscoveryQuery query, Instant beforeAt, UUID beforeId, int limit) {
        return itineraries
                .findDiscoveryPage(
                        arrayOf(query.excludedTripIds()),
                        query.text(),
                        query.destination(),
                        query.minDays(),
                        query.maxDays(),
                        beforeAt,
                        beforeId,
                        limit)
                .stream()
                .map(ItineraryDiscoveryService::viewOf)
                .toList();
    }


    @Override
    @Transactional(readOnly = true)
    public long count(DiscoveryQuery query) {
        return itineraries.countDiscoverable(
                arrayOf(query.excludedTripIds()),
                query.text(),
                query.destination(),
                query.minDays(),
                query.maxDays());
    }


    @Override
    @Transactional(readOnly = true)
    public List<DiscoverableItinerary> mostRecent(DiscoveryQuery query, int limit) {
        return page(query, null, null, limit);
    }


    @Override
    @Transactional(readOnly = true)
    public List<String> destinationsPublishedSince(DiscoveryQuery query, Instant since, int limit) {
        return itineraries.findTrendingDestinations(
                arrayOf(query.excludedTripIds()),
                query.text(),
                query.destination(),
                query.minDays(),
                query.maxDays(),
                since,
                limit);
    }


    @Override
    @Transactional(readOnly = true)
    public List<String> titlesMatching(DiscoveryQuery query, int limit) {
        return itineraries.findMatchingTitles(
                arrayOf(query.excludedTripIds()),
                query.text(),
                query.destination(),
                query.minDays(),
                query.maxDays(),
                limit);
    }


    @Override
    @Transactional(readOnly = true)
    public long countOwnedBy(UUID ownerId, Collection<UUID> excludedTripIds) {
        return itineraries.countOwnedBy(ownerId, arrayOf(excludedTripIds));
    }


    @Override
    @Transactional(readOnly = true)
    public long countDestinationsOwnedBy(UUID ownerId, Collection<UUID> excludedTripIds) {
        return itineraries.countDestinationsOwnedBy(ownerId, arrayOf(excludedTripIds));
    }


    @Override
    @Transactional(readOnly = true)
    public List<DiscoverableItinerary> ownedPage(
            UUID ownerId, Collection<UUID> excludedTripIds, Instant beforeAt, UUID beforeId, int limit) {
        return itineraries
                .findOwnedPage(ownerId, arrayOf(excludedTripIds), beforeAt, beforeId, limit)
                .stream()
                .map(ItineraryDiscoveryService::viewOf)
                .toList();
    }


    private static DiscoverableItinerary viewOf(ItineraryObject object) {
        return new DiscoverableItinerary(
                object.id(),
                object.tripId(),
                object.ownerId(),
                object.title(),
                object.destination(),
                object.durationDays(),
                object.coverImageUrl(),
                object.publishedAt());
    }


    private static String arrayOf(Collection<UUID> ids) {
        return ids == null || ids.isEmpty()
                ? "{}"
                : ids.stream().map(UUID::toString).collect(Collectors.joining(",", "{", "}"));
    }
}
