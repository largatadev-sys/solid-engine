package com.largata.itinerary.api;

import com.largata.itinerary.ActivityFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;

/**
 * The create/edit-activity body (S1.3) — one shape for both, because last-write-wins means an edit
 * sends the whole activity, exactly as create does.
 *
 * <p><strong>{@code costAmount} and {@code timeOfDay} are strings on the wire, parsed here.</strong>
 * Cost is a string for the reason {@code ActivityResponse} serialises it as one — money must not
 * round-trip through a JavaScript float — so the request carries `"500.00"` and this parses it to a
 * {@link BigDecimal} at the boundary. Time is an ISO local time (`"14:00"`), no date, no zone
 * (ADR-013).
 *
 * <p><strong>Malformed format is a 400 at the DTO door, not a 500 in the parser.</strong> A raw
 * {@code IllegalArgumentException} from {@link #toFields()} would fall through the global handler to a
 * 500 (there is no {@code IllegalArgumentException} mapping, deliberately — the domain factories throw
 * it only for non-DTO callers, the two-door backstop). So the shape of a time and an amount is
 * asserted here declaratively via {@code @Pattern}, where a bad value is a good 400 — and {@link
 * #toFields()}'s own parse guards become defence in depth for a caller that skips this DTO (a fork, an
 * import), never the user's error path.
 *
 * <p>Bean Validation guards the cheap, declarable rules (title present, lengths, formats); the richer
 * ones — cost amount/currency travelling together, non-negative — live in {@link ActivityFields}, the
 * domain value object both this and the factory route through, so the DTO and the domain cannot
 * disagree. Those richer rules are reachable from user input too, so the domain must still guard
 * them; but they are rare-shape mistakes, and a 500 for "amount without currency" is the accepted
 * backstop cost of not re-encoding a cross-field rule in Bean Validation for one endpoint.
 */
public record ActivityRequest(
        @NotBlank(message = "An activity needs a title.")
                @Size(max = 200, message = "A title may be at most 200 characters.")
                String title,
        // HH:mm or HH:mm:ss, 24-hour — the ISO-local-time shapes LocalTime.parse accepts. Blank/absent
        // is allowed (time is optional); a present value must be well-formed, caught here as a 400.
        @Pattern(
                        regexp = "^$|^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$",
                        message = "A time of day must look like 14:00.")
                String timeOfDay,
        // An optional decimal, up to two places — money. Blank/absent allowed; a present value must be
        // numeric (the sign/range rules are the domain's, in ActivityFields).
        @Pattern(regexp = "^$|^\\d+(\\.\\d{1,2})?$", message = "An estimated cost must be a number like 500 or 500.00.")
                String costAmount,
        @Size(max = 8, message = "A currency code may be at most 8 characters.") String costCurrency,
        @Size(max = 500, message = "A place may be at most 500 characters.") String place,
        @Size(max = 4000, message = "A description may be at most 4000 characters.") String description,
        @Size(max = 4000, message = "Notes may be at most 4000 characters.") String notes,
        @Size(max = 500, message = "A link may be at most 500 characters.") String externalUrl) {

    /**
     * Parses the wire strings into a validated {@link ActivityFields}. Raises {@link
     * IllegalArgumentException} (→ 400) for a malformed time or amount, or for any domain rule the
     * value object enforces — the one place the wire's strings become the domain's types.
     */
    public ActivityFields toFields() {
        return new ActivityFields(
                title, parseTime(timeOfDay), parseAmount(costAmount), costCurrency, place, description, notes,
                externalUrl);
    }

    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(value.strip());
        } catch (DateTimeParseException notATime) {
            throw new IllegalArgumentException("A time of day must look like 14:00", notATime);
        }
    }

    private static BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.strip());
        } catch (NumberFormatException notANumber) {
            throw new IllegalArgumentException("An estimated cost must be a number", notANumber);
        }
    }
}
