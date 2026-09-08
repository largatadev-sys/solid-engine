package com.largata.trip.trip;

import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripFacts;
import com.largata.trip.api.TripTeaser;
import com.largata.trip.exception.TripNotFoundException;
import com.largata.trip.workspace.WorkspaceService;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


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


    @Transactional
    public void markPublished(UUID tripId, Instant at) {
        trips.findById(tripId).ifPresent(trip -> trip.markPublishedAt(at));
    }


    @Transactional
    public void markUnpublished(UUID tripId) {
        trips.findById(tripId).ifPresent(Trip::unpublish);
    }

}
