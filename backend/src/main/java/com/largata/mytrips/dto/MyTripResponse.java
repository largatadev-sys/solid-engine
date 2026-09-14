package com.largata.mytrips.dto;

import com.largata.common.api.Page;
import com.largata.common.authz.PublicationState;
import com.largata.common.geo.PinPayload;
import com.largata.trip.api.TripListEntry;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public record MyTripResponse(
        UUID id,
        String title,
        String destination,
        PinPayload pin,
        String currency,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        boolean published,
        UUID itineraryId,
        Instant publishedAt,
        String visibility,
        boolean archived,
        UUID lastEditedBy,
        Instant lastEditedAt,
        List<Void> days,
        Instant createdAt,
        String workspaceState,
        String lastEditedByHandle,
        String lastEditedByName,
        Void lease,
        boolean beingEdited,
        Void editingSession,
        long planVersion,
        Void forkedFrom,
        int dayCount,
        String viewerRole,
        Integer memberCount) {


    public static Page<MyTripResponse> pageOf(
            Page<TripListEntry> page, Map<UUID, PublicationState.LivePublication> live) {
        return page.map(trip -> of(trip, live.get(trip.id())));
    }


    private static MyTripResponse of(TripListEntry trip, PublicationState.LivePublication live) {
        return new MyTripResponse(
                trip.id(),
                trip.title(),
                trip.destination(),
                PinPayload.of(trip.pin()),
                trip.currency(),
                trip.description(),
                trip.standouts(),
                trip.bestTimeOfYear(),
                trip.coverImageUrl(),
                trip.startDate(),
                trip.endDate(),
                trip.lifecycle().wireName(),
                live != null,
                live == null ? null : live.itineraryId(),
                live == null ? null : live.publishedAt(),
                trip.visibility(),
                trip.archived(),
                trip.lastEditedBy(),
                trip.lastEditedAt(),
                List.of(),
                trip.createdAt(),
                trip.workspaceState(),
                null,
                null,
                null,
                trip.beingEdited(),
                null,
                trip.planVersion(),
                null,
                trip.dayCount(),
                trip.viewerRole(),
                trip.memberCount());
    }
}
