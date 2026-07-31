package com.largata.itinerary;

import java.time.LocalDate;
import java.util.List;


public record ItineraryFields(
        String title,
        List<String> destinations,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        LocalDate startDate,
        LocalDate endDate) {

    public ItineraryFields {
        title = requireTitle(title);
        destinations = requireDestinations(destinations);
        description = boundedOrNull(description, Itinerary.MAX_DESCRIPTION_LENGTH, "description");
        standouts = cleanStandouts(standouts);
        bestTimeOfYear = boundedOrNull(bestTimeOfYear, Itinerary.MAX_BEST_TIME_LENGTH, "best time of year");

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("An itinerary cannot end before it starts");
        }
    }


    static ItineraryFields untitledPlan(
            String title, List<String> destinations, String description, LocalDate startDate, LocalDate endDate) {
        return new ItineraryFields(title, destinations, description, List.of(), null, startDate, endDate);
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


    private static List<String> requireDestinations(List<String> destinations) {
        if (destinations == null || destinations.isEmpty()) {
            throw new IllegalArgumentException("An itinerary needs at least one destination");
        }
        if (destinations.stream().anyMatch(d -> d == null || d.isBlank())) {
            throw new IllegalArgumentException("An itinerary's destinations cannot be blank");
        }
        return destinations.stream().map(String::strip).toList();
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
}
