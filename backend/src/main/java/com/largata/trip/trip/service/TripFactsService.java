package com.largata.trip.trip.service;

import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripFacts;
import com.largata.trip.api.TripTeaser;
import com.largata.trip.exception.TripNotFoundException;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.trip.entity.Trip;


@Service
class TripFactsService implements TripApi {

    private final TripRepository trips;
    private final WorkspaceService workspaces;

    TripFactsService(TripRepository trips, WorkspaceService workspaces) {
        this.trips = trips;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public Optional<TripFacts> factsOf(UUID tripId) {
        return trips.findById(tripId).map(this::factsFrom);
    }


    private TripFacts factsFrom(Trip trip) {
        return new TripFacts(
                trip.id(),
                trip.ownerId(),
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                trip.state(),
                trip.isPublished(),
                workspaces.isArchived(trip.id()),
                trip.createdAt());
    }


    @Transactional(readOnly = true)
    public Optional<TripTeaser> teaserOf(UUID tripId) {
        return trips.findById(tripId).map(TripFactsService::teaserFrom);
    }


    @Override
    @Transactional(readOnly = true)
    public java.util.List<TripTeaser> teasersOf(java.util.Collection<UUID> tripIds) {
        if (tripIds.isEmpty()) {
            return java.util.List.of();
        }
        return java.util.stream.StreamSupport.stream(
                        trips.findAllById(tripIds).spliterator(), false)
                .map(TripFactsService::teaserFrom)
                .toList();
    }


    private static TripTeaser teaserFrom(Trip trip) {
        return new TripTeaser(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                trip.coverImageUrl(),
                trip.isPublished());
    }


    @Transactional(readOnly = true)
    public Map<UUID, String> titlesByIds(Collection<UUID> tripIds) {
        if (tripIds.isEmpty()) {
            return Map.of();
        }
        return trips.findAllById(tripIds).stream()
                .collect(Collectors.toMap(Trip::id, Trip::title));
    }


    @Transactional(readOnly = true)
    public long shareCardVersionOf(UUID tripId) {
        Long version = trips.shareCardVersionOf(tripId);
        if (version == null) {
            throw new TripNotFoundException();
        }
        return version;
    }


    @Transactional(readOnly = true)
    public boolean frozen(UUID tripId) {
        return workspaces.isArchived(tripId);
    }

}
