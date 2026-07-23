package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

/**
 * An activity as seen from outside the module (S1.3) — the public projection of an {@link Activity}
 * row, the same move {@code MembershipView} and {@code InboxInvitation} make so a package-private
 * entity never leaves the module (ADR-002).
 *
 * <p>Carries every displayable field; the {@code .api} response DTO maps from this. {@code timeOfDay}
 * is a {@link LocalTime} here (the domain type) and becomes an ISO string at the wire boundary.
 */
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
