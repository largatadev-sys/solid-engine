package com.largata.itinerary.api;

import com.largata.identity.TravelerSummary;
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
        List<String> destinations,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        String visibility,
        boolean archived,
        UUID lastEditedBy,
        Instant lastEditedAt,
        List<DayResponse> days,
        Instant createdAt,
        String workspaceState,
        String lastEditedByHandle,
        String lastEditedByName,
        LeaseHolderResponse lease) {


    public static ItineraryResponse summaryOf(Itinerary itinerary, WorkspaceState workspaceState) {
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                workspaceState.isArchived(),
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                List.of(),
                itinerary.createdAt(),
                workspaceState.wireName(),
                null,
                null,
                null);
    }


    public static ItineraryResponse of(ItineraryPlan plan) {
        Itinerary itinerary = plan.itinerary();
        TravelerSummary editor = plan.editor(itinerary.lastEditedBy());
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                plan.archived(),
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                plan.days().stream().map(day -> DayResponse.annotated(day, plan)).toList(),
                itinerary.createdAt(),
                plan.workspaceState().wireName(),
                editor == null ? null : editor.handle(),
                editor == null ? null : editor.displayName(),
                LeaseHolderResponse.of(plan.holderOf(LeaseSubject.header(itinerary.id()))));
    }
}
