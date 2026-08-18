package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Objects;


public record ActivityFields(
        String title,
        LocalTime timeOfDay,
        BigDecimal costAmount,
        String costCurrency,
        String place,
        String description,
        String notes,
        String externalUrl,
        String bookingPurpose,
        String bookingProvider,
        BigDecimal bookingPriceAmount,
        String bookingPriceCurrency) {

    public ActivityFields pricedIn(String tripCurrency) {
        if (costAmount == null || tripCurrency == null) {
            return this;
        }
        return new ActivityFields(
                title,
                timeOfDay,
                costAmount,
                tripCurrency,
                place,
                description,
                notes,
                externalUrl,
                bookingPurpose,
                bookingProvider,
                bookingPriceAmount,
                bookingPriceCurrency);
    }


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
        bookingPurpose = blankToNull(bookingPurpose, MAX_SHORT_TEXT_LENGTH, "booking purpose");
        bookingProvider = blankToNull(bookingProvider, MAX_SHORT_TEXT_LENGTH, "booking provider");
        bookingPriceCurrency = blankToNull(bookingPriceCurrency, MAX_CURRENCY_LENGTH, "booking currency");

        if ((costAmount == null) != (costCurrency == null)) {
            throw new IllegalArgumentException("An estimated cost needs both an amount and a currency, or neither");
        }
        if (costAmount != null && costAmount.signum() < 0) {
            throw new IllegalArgumentException("An estimated cost cannot be negative");
        }
        if ((bookingPriceAmount == null) != (bookingPriceCurrency == null)) {
            throw new IllegalArgumentException("A booking price needs both an amount and a currency, or neither");
        }
        if (bookingPriceAmount != null && bookingPriceAmount.signum() < 0) {
            throw new IllegalArgumentException("A booking price cannot be negative");
        }
    }

    boolean describesSamePlanAs(ActivityFields other) {
        return Objects.equals(title, other.title)
                && Objects.equals(timeOfDay, other.timeOfDay)
                && sameAmount(costAmount, other.costAmount)
                && Objects.equals(costCurrency, other.costCurrency)
                && Objects.equals(place, other.place)
                && Objects.equals(description, other.description)
                && Objects.equals(notes, other.notes)
                && Objects.equals(externalUrl, other.externalUrl)
                && Objects.equals(bookingPurpose, other.bookingPurpose)
                && Objects.equals(bookingProvider, other.bookingProvider)
                && sameAmount(bookingPriceAmount, other.bookingPriceAmount)
                && Objects.equals(bookingPriceCurrency, other.bookingPriceCurrency);
    }


    private static boolean sameAmount(BigDecimal one, BigDecimal other) {
        if (one == null || other == null) {
            return one == other;
        }
        return one.compareTo(other) == 0;
    }


    static ActivityFields of(Activity activity) {
        return new ActivityFields(
                activity.title(),
                activity.timeOfDay(),
                activity.costAmount(),
                activity.costCurrency(),
                activity.place(),
                activity.description(),
                activity.notes(),
                activity.externalUrl(),
                activity.bookingPurpose(),
                activity.bookingProvider(),
                activity.bookingPriceAmount(),
                activity.bookingPriceCurrency());
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
