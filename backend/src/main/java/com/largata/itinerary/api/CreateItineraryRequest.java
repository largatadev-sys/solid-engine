package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/**
 * The create-itinerary contract (S0.3 spec, API contract).
 *
 * <p><strong>Every field here is permanent</strong> (ADR-008): within {@code /v1} nothing may be
 * renamed, retyped, removed, or have its meaning changed — old app versions keep calling for weeks.
 * That asymmetry drove two grilling decisions:
 *
 * <ul>
 *   <li><strong>{@code destinations} is a list</strong>, though S0.3's form submits one value. A
 *       singular {@code destination} could never become plural — only gain a second field beside it,
 *       with precedence rules documented forever. Artifact 02 already says "destination(s)".
 *   <li><strong>Dates are optional</strong>, and that direction is deliberate: a required field can
 *       be relaxed later additively (old clients keep sending it), while an optional one can never
 *       be tightened. So optional had to be *believed*, not defaulted to — and it is: the dreamer's
 *       undated draft and E4's fork (where copying the source's dates would be wrong) both produce
 *       itineraries with no dates.
 * </ul>
 *
 * @param title what the traveler calls this trip
 * @param destinations at least one non-blank free text destination; no geocoding, no place ids —
 *     structure can be added additively if E4's discovery ever needs it
 * @param description optional free-text (S1.3); blank collapses to null in the domain factory
 * @param startDate optional calendar date — no time, no timezone: a trip starts on a day, wherever
 *     on earth you are
 * @param endDate optional; must not precede {@code startDate} when both are given (checked in the
 *     domain factory, which is the rule's real home)
 * @param durationDays optional (S1.3): how many empty days to mint (ADR-013). Absent/null means an
 *     undated skeleton with zero days — a valid plan. Bounded and non-negative here, the DTO's half
 *     of the domain rule the {@code DayService} enforces.
 */
@ChronologicalDates
public record CreateItineraryRequest(
        @NotBlank(message = "A title is required.")
                // The bound is the domain's, referenced rather than repeated: an annotation needs a
                // compile-time constant, so this is the one form of sharing available — and without
                // it the two limits drift the first time either is changed alone.
                @Size(max = Itinerary.MAX_TITLE_LENGTH, message = "A title may be at most 120 characters.")
                String title,
        @NotEmpty(message = "At least one destination is required.")
                List<@NotBlank(message = "A destination cannot be blank.") String> destinations,
        @Size(max = Itinerary.MAX_DESCRIPTION_LENGTH, message = "A description may be at most 4000 characters.")
                String description,
        LocalDate startDate,
        LocalDate endDate,
        @PositiveOrZero(message = "Duration cannot be negative.")
                @Max(value = Itinerary.MAX_DAYS, message = "An itinerary has at most 366 days.")
                Integer durationDays)
        implements HasDateRange {

    /** How many days to seed — absent means zero (an undated skeleton), never an error. */
    public int durationDaysOrZero() {
        return durationDays == null ? 0 : durationDays;
    }
}
