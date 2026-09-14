package com.largata.trip.trip.service;

import com.largata.common.api.Page;
import com.largata.common.authz.Role;
import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripFacts;
import com.largata.trip.api.TripListEntry;
import com.largata.trip.api.TripListQuery;
import com.largata.trip.api.TripTeaser;
import com.largata.trip.exception.TripNotFoundException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.workspace.entity.WorkspaceState;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.entity.TripCategory;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.trip.entity.Trip;


@Service
class TripFactsService implements TripApi {

    private final TripRepository trips;
    private final WorkspaceService workspaces;
    private final TripService itineraries;

    TripFactsService(TripRepository trips, WorkspaceService workspaces, TripService itineraries) {
        this.trips = trips;
        this.workspaces = workspaces;
        this.itineraries = itineraries;
    }


    @Override
    @Transactional(readOnly = true)
    public Page<TripListEntry> listFor(TripListQuery query) {
        Page<Trip> page =
                itineraries.listMine(
                        query.travelerId(),
                        query.cursor(),
                        query.limit(),
                        query.archived(),
                        TripCategory.parse(query.category()).orElse(null));
        List<UUID> ids = page.items().stream().map(Trip::id).toList();
        Set<UUID> beingEdited = itineraries.beingEditedAmong(ids);
        Map<UUID, Long> dayCounts = itineraries.dayCountsAmong(ids);
        Set<UUID> owned = itineraries.ownedAmong(query.travelerId(), ids);
        Map<UUID, Integer> memberCounts = itineraries.memberCountsAmong(ids);
        Map<UUID, WorkspaceState> states = new java.util.HashMap<>();
        ids.forEach(id -> workspaces.stateOf(id).ifPresent(st -> states.put(id, st)));
        return page.map(
                trip ->
                        entryOf(
                                trip,
                                states.getOrDefault(trip.id(), WorkspaceState.ACTIVE),
                                beingEdited.contains(trip.id()),
                                dayCounts.getOrDefault(trip.id(), 0L).intValue(),
                                owned.contains(trip.id()) ? Role.OWNER : Role.MEMBER,
                                memberCounts.getOrDefault(trip.id(), 1)));
    }


    private static TripListEntry entryOf(
            Trip trip,
            WorkspaceState workspaceState,
            boolean beingEdited,
            int dayCount,
            Role viewerRole,
            int memberCount) {
        return new TripListEntry(
                trip.id(),
                trip.title(),
                trip.destination(),
                trip.pin(),
                trip.currency(),
                trip.description(),
                trip.standouts(),
                trip.bestTimeOfYear(),
                trip.coverImageUrl(),
                trip.startDate(),
                trip.endDate(),
                trip.state(),
                trip.visibility().wireName(),
                workspaceState.isArchived(),
                workspaceState.wireName(),
                trip.lastEditedBy(),
                trip.lastEditedAt(),
                trip.createdAt(),
                trip.planVersion(),
                beingEdited,
                dayCount,
                viewerRole,
                memberCount);
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
