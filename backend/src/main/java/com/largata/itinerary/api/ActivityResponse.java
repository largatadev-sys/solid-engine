package com.largata.itinerary.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.itinerary.ActivityView;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * An activity as the API shows it (S1.3), embedded under its day in the plan.
 *
 * <p><strong>Ticket 01 ships the shape; ticket 02 ships the data.</strong> Until ticket 02 gives
 * activities their CRUD, every day's activity list is empty — but the shape is fixed now, so the
 * client that renders a day already knows how to render its activities, and ticket 02 adds no field
 * the client must learn.
 *
 * <p>Cost is amount + currency, both nullable together (planning money — spec §boundary): {@code null}
 * amount is "unstated", a zero amount is "Free". {@code timeOfDay} is an ISO local time ({@code
 * "14:00"}), no date, no zone (ADR-013).
 *
 * <p><strong>{@code costAmount} serialises as a JSON string, not a number</strong>, and the annotation
 * is load-bearing. A {@link BigDecimal} left to Jackson's default becomes a JSON number, which a
 * JavaScript client parses into a float — the exact round-trip through binary floating point that
 * money must never take. {@code JsonFormat(shape = STRING)} keeps it verbatim on the wire (`"500.00"`),
 * so the mobile type ({@code costAmount: string | null}) is honest and the value reaches the UI
 * unrounded. Caught at S1.3's code review as a latent mismatch before any activity populated it.
 */
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

    /**
     * Maps a projection to its wire form, converting the domain {@code LocalTime} to an ISO string
     * ({@code "14:00"}) at the boundary — the one place the time crosses from domain type to wire
     * type. The cost {@link BigDecimal} rides through as-is; the {@code @JsonFormat} above makes it a
     * string on serialisation.
     */
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
