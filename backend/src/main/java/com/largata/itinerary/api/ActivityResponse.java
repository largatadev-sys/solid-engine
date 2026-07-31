package com.largata.itinerary.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.identity.TravelerSummary;
import com.largata.itinerary.ActivityView;
import com.largata.itinerary.ItineraryPlan;
import com.largata.itinerary.LeaseHolder;
import com.largata.itinerary.LeaseSubject;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;


public record ActivityResponse(
        UUID id,
        int sortOrder,
        String title,
        String timeOfDay,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal costAmount,
        String costCurrency,
        String place,
        String description,
        String notes,
        String externalUrl,
        UUID lastEditedBy,
        Instant lastEditedAt,
        String lastEditedByHandle,
        String lastEditedByName,
        LeaseHolderResponse lease) {


    public static ActivityResponse of(ActivityView a) {
        return build(a, null, null);
    }


    static ActivityResponse annotated(ActivityView a, ItineraryPlan plan) {
        return build(a, plan.editor(a.lastEditedBy()), plan.holderOf(LeaseSubject.activity(a.id())));
    }


    private static ActivityResponse build(ActivityView a, TravelerSummary editor, LeaseHolder holder) {
        return new ActivityResponse(
                a.id(),
                a.sortOrder(),
                a.title(),
                a.timeOfDay() == null ? null : a.timeOfDay().toString(),
                a.costAmount(),
                a.costCurrency(),
                a.place(),
                a.description(),
                a.notes(),
                a.externalUrl(),
                a.lastEditedBy(),
                a.lastEditedAt(),
                editor == null ? null : editor.handle(),
                editor == null ? null : editor.displayName(),
                LeaseHolderResponse.of(holder));
    }
}
