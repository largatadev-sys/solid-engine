package com.largata.itinerary;

import java.time.LocalDate;
import java.util.List;


public record ItineraryFields(
        String title,
        String destination,
        String currency,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        LocalDate startDate,
        LocalDate endDate,
        Pin pin) {

    public static final String DEFAULT_CURRENCY = "PHP";


    public static final int MAX_CURRENCY_LENGTH = 8;


    public ItineraryFields {
        title = requireTitle(title);
        destination = requireDestination(destination);
        currency = currency == null ? null : requireCurrency(currency);
        description = boundedOrNull(description, Itinerary.MAX_DESCRIPTION_LENGTH, "description");
        standouts = standouts == null ? null : cleanStandouts(standouts);
        bestTimeOfYear = bestTimeOfYear == null ? null : bounded(bestTimeOfYear, Itinerary.MAX_BEST_TIME_LENGTH);

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("An itinerary cannot end before it starts");
        }
    }


    static ItineraryFields withoutPublishMetadata(
            String title, String destination, String description, LocalDate startDate, LocalDate endDate) {
        return new ItineraryFields(
                title, destination, DEFAULT_CURRENCY, description, List.of(), "", startDate, endDate, null);
    }


    private static String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("An itinerary needs a title");
        }
        String stripped = title.strip();
        if (stripped.length() > Itinerary.MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException(
                    "An itinerary's title is at most " + Itinerary.MAX_TITLE_LENGTH + " characters");
        }
        return stripped;
    }


    private static String requireDestination(String destination) {
        if (destination == null || destination.isBlank()) {
            throw new IllegalArgumentException("An itinerary needs a destination");
        }
        String stripped = destination.strip();
        if (stripped.length() > Itinerary.MAX_DESTINATION_LENGTH) {
            throw new IllegalArgumentException(
                    "An itinerary's destination is at most " + Itinerary.MAX_DESTINATION_LENGTH + " characters");
        }
        return stripped;
    }


    private static String requireCurrency(String currency) {
        if (currency.isBlank()) {
            throw new IllegalArgumentException("An itinerary's currency cannot be blank");
        }
        String normalized = currency.strip().toUpperCase(java.util.Locale.ROOT);
        if (normalized.length() > MAX_CURRENCY_LENGTH) {
            throw new IllegalArgumentException(
                    "An itinerary's currency is at most " + MAX_CURRENCY_LENGTH + " characters");
        }
        return normalized;
    }


    private static List<String> cleanStandouts(List<String> standouts) {
        if (standouts == null) {
            return List.of();
        }
        List<String> kept =
                standouts.stream()
                        .filter(standout -> standout != null && !standout.isBlank())
                        .map(String::strip)
                        .toList();
        if (kept.size() > Itinerary.MAX_STANDOUTS) {
            throw new IllegalArgumentException(
                    "An itinerary has at most " + Itinerary.MAX_STANDOUTS + " standouts");
        }
        if (kept.stream().anyMatch(standout -> standout.length() > Itinerary.MAX_STANDOUT_LENGTH)) {
            throw new IllegalArgumentException(
                    "A standout is at most " + Itinerary.MAX_STANDOUT_LENGTH + " characters");
        }
        return kept;
    }


    private static String boundedOrNull(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String stripped = value.strip();
        if (stripped.length() > max) {
            throw new IllegalArgumentException("An itinerary's " + field + " is at most " + max + " characters");
        }
        return stripped;
    }


    private static String bounded(String value, int max) {
        String stripped = value.strip();
        if (stripped.length() > max) {
            throw new IllegalArgumentException(
                    "An itinerary's best time of year is at most " + max + " characters");
        }
        return stripped;
    }
}
