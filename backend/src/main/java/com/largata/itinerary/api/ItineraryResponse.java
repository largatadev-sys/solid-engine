package com.largata.itinerary.api;

import com.largata.identity.TravelerSummary;
import com.largata.itinerary.ForkService;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryPlan;
import com.largata.itinerary.LeaseSubject;
import com.largata.workspace.WorkspaceState;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record ItineraryResponse(
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


    public static ItineraryResponse summaryOf(
            Itinerary itinerary,
            WorkspaceState workspaceState,
            boolean beingEdited,
            int dayCount,
            String viewerRole,
            Integer memberCount) {
        return new ItineraryResponse(
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
                itinerary.isPublished(),
                itinerary.visibility().wireName(),
                workspaceState.isArchived(),
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                List.of(),
                itinerary.createdAt(),
                workspaceState.wireName(),
                null,
                null,
                null,
                beingEdited,
                null,
                itinerary.planVersion(),
                null,
                dayCount,
                viewerRole,
                memberCount);
    }


    public static ItineraryResponse of(ItineraryPlan plan) {
        return of(plan, null);
    }


    public static ItineraryResponse of(ItineraryPlan plan, ForkService.ForkProvenance provenance) {
        Itinerary itinerary = plan.itinerary();
        TravelerSummary editor = plan.editor(itinerary.lastEditedBy());
        return new ItineraryResponse(
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
                itinerary.isPublished(),
                itinerary.visibility().wireName(),
                plan.archived(),
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                plan.days().stream().map(day -> DayResponse.annotated(day, plan)).toList(),
                itinerary.createdAt(),
                plan.workspaceState().wireName(),
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
