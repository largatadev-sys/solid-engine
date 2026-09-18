package com.largata.trip.trip.dto;

import com.largata.trip.api.ForkApi;
import com.largata.trip.api.WorkspaceStateProjection;
import com.largata.common.geo.PinPayload;
import com.largata.identity.TravelerSummary;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.plan.entity.TripPlanTree;
import com.largata.trip.editing.entity.LeaseSubject;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.largata.trip.plan.dto.DayResponse;
import com.largata.trip.editing.dto.LeaseHolderResponse;
import com.largata.trip.fork.ForkedFromResponse;


public record TripResponse(
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
        List<DayResponse> days,
        Instant createdAt,
        String workspaceState,
        String lastEditedByHandle,
        String lastEditedByName,
        LeaseHolderResponse lease,
        boolean beingEdited,
        LeaseHolderResponse editingSession,
        long planVersion,
        ForkedFromResponse forkedFrom,
        int dayCount,
        String viewerRole,
        Integer memberCount) {


    public static TripResponse of(TripPlanTree plan) {
        return of(plan, null);
    }


    public static TripResponse of(TripPlanTree plan, ForkApi.ForkProvenanceView provenance) {
        Trip itinerary = plan.itinerary();
        TravelerSummary editor = plan.editor(itinerary.lastEditedBy());
        return new TripResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                PinPayload.of(itinerary.pin()),
                itinerary.currency(),
                itinerary.description(),
                itinerary.standouts(),
                itinerary.bestTimeOfYear(),
                itinerary.coverImageUrl(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                plan.published(),
                plan.itineraryId(),
                plan.publishedAt(),
                itinerary.visibility().wireName(),
                plan.archived(),
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                plan.days().stream().map(day -> DayResponse.annotated(day, plan)).toList(),
                itinerary.createdAt(),
                WorkspaceStateProjection.of(itinerary.state(), plan.archived()),
                editor == null ? null : editor.handle(),
                editor == null ? null : editor.displayName(),
                LeaseHolderResponse.of(plan.holderOf(LeaseSubject.header(itinerary.id()))),
                plan.hasLiveLease(),
                LeaseHolderResponse.of(plan.holderOf(LeaseSubject.session(itinerary.id()))),
                itinerary.planVersion(),
                ForkedFromResponse.of(provenance),
                plan.days().size(),
                null,
                null);
    }
}
