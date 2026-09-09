package com.largata.publication.service;

import com.largata.publication.api.ItineraryDiscoveryApi;
import com.largata.publication.entity.ItineraryObject;
import com.largata.publication.repository.ItineraryDiscoveryRepository;
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
                        arrayOf(query.excludedOwnerIds()),
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
                arrayOf(query.excludedOwnerIds()),
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
                arrayOf(query.excludedOwnerIds()),
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
                arrayOf(query.excludedOwnerIds()),
                query.text(),
                query.destination(),
                query.minDays(),
                query.maxDays(),
                limit);
    }


    @Override
    @Transactional(readOnly = true)
    public List<DiscoverableItinerary> ownedBy(UUID ownerId, Collection<UUID> excludedTripIds) {
        return itineraries.findOwnedBy(ownerId, arrayOf(excludedTripIds)).stream()
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
