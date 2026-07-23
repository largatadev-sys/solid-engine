package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import jakarta.validation.constraints.Size;

/**
 * The append-a-day / rename-a-day body (S1.3): an optional title, nothing else. Ordinal is the
 * server's to assign (append takes the next, ADR-013's contiguity), so it is never on the wire.
 *
 * <p>{@code title} is optional — a day may be untitled ("Day 3" with no name) — and bounded, the
 * DTO's half of the domain factory's rule. Blank collapses to null in the factory.
 */
public record DayRequest(
        @Size(max = Itinerary.MAX_DAY_TITLE_LENGTH, message = "A day title may be at most 120 characters.")
                String title) {}
