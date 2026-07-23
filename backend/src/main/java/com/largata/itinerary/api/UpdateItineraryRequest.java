package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/**
 * The edit-itinerary-fields contract (S1.3, ticket 04): title, destinations, description, dates.
 *
 * <p><strong>Whole-field, not a sparse patch.</strong> Despite the {@code PATCH} verb, the body
 * carries every editable field — last-write-wins means an edit sends the whole itinerary, exactly as
 * {@code ActivityRequest} does. A field left out is cleared (description) or would fail validation
 * (title, destinations), not "left as it was"; the client sends the current values it wants to keep.
 * PATCH rather than PUT because this is a partial view of the resource — it touches the editable
 * fields, never state, visibility or ownership, which have their own owner-only endpoints.
 *
 * <p>The rules mirror {@link Itinerary}'s {@code validateFields} for a clean 400 at the boundary (the
 * two-door discipline); the domain enforces the same set, so the DTO and the entity cannot drift. The
 * cross-field date rule (start ≤ end) lives in the domain, surfaced here as a class-level constraint
 * would be — but {@code CreateItineraryRequest} already carries {@code @ChronologicalDates}, so this
 * reuses it for the same 400 shape.
 *
 * @param title required, non-blank, bounded
 * @param destinations at least one, none blank — a list (canon), edited as a list (spec §Q4)
 * @param description optional; blank collapses to null in the domain
 * @param startDate optional calendar date
 * @param endDate optional; must not precede {@code startDate} when both are given
 */
@ChronologicalDates
public record UpdateItineraryRequest(
        @NotBlank(message = "A title is required.")
                @Size(max = Itinerary.MAX_TITLE_LENGTH, message = "A title may be at most 120 characters.")
                String title,
        @NotEmpty(message = "At least one destination is required.")
                List<@NotBlank(message = "A destination cannot be blank.") String> destinations,
        @Size(max = Itinerary.MAX_DESCRIPTION_LENGTH, message = "A description may be at most 4000 characters.")
                String description,
        LocalDate startDate,
        LocalDate endDate)
        implements HasDateRange {}
