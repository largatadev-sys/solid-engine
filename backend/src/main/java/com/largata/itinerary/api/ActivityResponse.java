package com.largata.itinerary.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.itinerary.ActivityView;
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
        Instant lastEditedAt) {


    public static ActivityResponse of(ActivityView a) {
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
                a.lastEditedAt());
    }
}
