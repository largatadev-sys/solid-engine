package com.largata.itinerary.api;

import com.largata.identity.TravelerSummary;
import com.largata.itinerary.DayView;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryPlan;
import com.largata.itinerary.LeaseSubject;
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
        String lastEditedByHandle,
        String lastEditedByName,
        LeaseHolderResponse lease) {


    public static ItineraryResponse of(Itinerary itinerary) {
        return of(itinerary, List.of(), false);
    }


    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days) {
        return of(itinerary, days, false);
    }


    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days, boolean archived) {
        return build(itinerary, days, archived, null);
    }


    public static ItineraryResponse of(ItineraryPlan plan) {
        return build(plan.itinerary(), plan.days(), plan.archived(), plan);
    }


    private static ItineraryResponse build(
            Itinerary itinerary, List<DayView> days, boolean archived, ItineraryPlan plan) {
        TravelerSummary editor = plan == null ? null : plan.editor(itinerary.lastEditedBy());
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                archived,
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                days.stream().map(day -> DayResponse.of(day, plan)).toList(),
                itinerary.createdAt(),
                editor == null ? null : editor.handle(),
                editor == null ? null : editor.displayName(),
                plan == null ? null : LeaseHolderResponse.of(plan.holderOf(LeaseSubject.header(itinerary.id()))));
    }
}
