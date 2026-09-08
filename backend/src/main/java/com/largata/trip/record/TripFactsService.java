package com.largata.trip.record;

import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripFacts;
import com.largata.trip.api.TripLifecycle;
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

    private final TripRepository itineraries;
    private final WorkspaceService workspaces;

    TripFactsService(TripRepository itineraries, WorkspaceService workspaces) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public Optional<TripFacts> factsOf(UUID tripId) {
        return itineraries.findById(tripId).map(this::factsFrom);
    }


    private TripFacts factsFrom(Trip trip) {
        return new TripFacts(
                trip.id(),
                trip.ownerId(),
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                lifecycleOf(trip),
                trip.isPublished(),
                workspaces.isArchived(trip.id()),
                trip.createdAt());
    }


    @Transactional(readOnly = true)
    public Optional<TripTeaser> teaserOf(UUID tripId) {
        return itineraries.findById(tripId).map(TripFactsService::teaserFrom);
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
        return itineraries.findAllById(tripIds).stream()
                .collect(Collectors.toMap(Trip::id, Trip::title));
    }


    @Transactional(readOnly = true)
    public long shareCardVersionOf(UUID tripId) {
        Long version = itineraries.shareCardVersionOf(tripId);
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
        itineraries.findById(tripId).orElseThrow(TripNotFoundException::new).markPublishedAt(at);
    }


    @Transactional
    public void markUnpublished(UUID tripId) {
        itineraries.findById(tripId).orElseThrow(TripNotFoundException::new).unpublish();
    }


    private static TripLifecycle lifecycleOf(Trip trip) {
        return TripLifecycle.parse(trip.state().name()).orElseThrow(TripNotFoundException::new);
    }
}
