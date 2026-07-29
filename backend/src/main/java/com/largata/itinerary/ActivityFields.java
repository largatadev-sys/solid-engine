package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.LocalTime;


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

        if ((costAmount == null) != (costCurrency == null)) {
            throw new IllegalArgumentException("An estimated cost needs both an amount and a currency, or neither");
        }
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
