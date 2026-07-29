package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;


public record ActivityView(
        UUID id,
        int sortOrder,
        String title,
        LocalTime timeOfDay,
        BigDecimal costAmount,
        String costCurrency,
        String place,
        String description,
        String notes,
        String externalUrl,
        UUID lastEditedBy,
        Instant lastEditedAt) {

    static ActivityView of(Activity a) {
        return new ActivityView(
                a.id(),
                a.sortOrder(),
                a.title(),
                a.timeOfDay(),
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
