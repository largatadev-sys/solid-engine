package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * The editable content of an {@link Activity} (S1.3) — one value object both {@code create} and
 * {@code edit} take, so the two can never disagree about what a valid activity is.
 *
 * <p><strong>Why a bundle and not eight parameters.</strong> An activity has eight editable fields;
 * a {@code create(dayId, title, time, amount, currency, place, description, notes, url, editor, at)}
 * is the "Data Clumps" smell made flesh — the same run of fields travelling together through the
 * factory, the mutator, and (in a different shape) the DTO. Naming the clump is the fix: this record
 * is the activity's content, passed as one thing.
 *
 * <p><strong>Validation lives here, at construction</strong> — so an invalid {@code ActivityFields}
 * cannot exist, and neither create nor edit needs to re-check. The rules are the domain's half of the
 * DTO's (the two-door discipline, {@code Itinerary.draft}'s pattern): a caller that bypasses the DTO
 * (a fork, an import) still cannot build an activity with a blank title or an amount without a
 * currency. Blank optional strings collapse to {@code null} — an empty place is "no place", not a
 * place that is the empty string.
 *
 * @param title required, non-blank, bounded
 * @param timeOfDay optional local time-of-day, timezone-free (ADR-013) — display metadata, not a sort key
 * @param costAmount optional planning money; {@code null} = unstated, zero = "Free". Must be non-negative
 *     and must travel with a currency
 * @param costCurrency the currency for {@code costAmount}; null exactly when the amount is
 * @param place optional free text (ADR-013)
 * @param description optional free text
 * @param notes optional private planning notes (spec §fields)
 * @param externalUrl optional single link (spec §links)
 */
public record ActivityFields(
        String title,
        LocalTime timeOfDay,
        BigDecimal costAmount,
        String costCurrency,
        String place,
        String description,
        String notes,
        String externalUrl) {

    static final int MAX_TITLE_LENGTH = 200;
    static final int MAX_SHORT_TEXT_LENGTH = 500;
    static final int MAX_LONG_TEXT_LENGTH = 4000;
    static final int MAX_CURRENCY_LENGTH = 8;

    public ActivityFields {
        title = requireBoundedNonBlank(title, MAX_TITLE_LENGTH, "An activity needs a title");
        place = blankToNull(place, MAX_SHORT_TEXT_LENGTH, "place");
        description = blankToNull(description, MAX_LONG_TEXT_LENGTH, "description");
        notes = blankToNull(notes, MAX_LONG_TEXT_LENGTH, "notes");
        externalUrl = blankToNull(externalUrl, MAX_SHORT_TEXT_LENGTH, "link");
        costCurrency = blankToNull(costCurrency, MAX_CURRENCY_LENGTH, "currency");

        // Amount and currency are one fact ("₱500"), not two independent fields. Either both are
        // present or both absent — an amount without a currency is a number with no units, and a
        // currency with no amount is a label for nothing. This is the invariant the entity's javadoc
        // promises and the column pair leaves un-enforced; here is where it holds.
        if ((costAmount == null) != (costCurrency == null)) {
            throw new IllegalArgumentException("An estimated cost needs both an amount and a currency, or neither");
        }
        // Zero is legal — it is "Free", a real fact (spec §fields). Negative is not: a cost cannot be
        // below nothing, and a negative estimate is almost certainly a data-entry slip worth rejecting.
        if (costAmount != null && costAmount.signum() < 0) {
            throw new IllegalArgumentException("An estimated cost cannot be negative");
        }
    }

    private static String requireBoundedNonBlank(String value, int max, String blankMessage) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(blankMessage);
        }
        String stripped = value.strip();
        if (stripped.length() > max) {
            throw new IllegalArgumentException("That value is at most " + max + " characters");
        }
        return stripped;
    }

    private static String blankToNull(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String stripped = value.strip();
        if (stripped.length() > max) {
            throw new IllegalArgumentException("An activity's " + field + " is at most " + max + " characters");
        }
        return stripped;
    }
}
