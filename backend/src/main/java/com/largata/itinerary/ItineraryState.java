package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum ItineraryState {
    UPCOMING,
    ONGOING,
    COMPLETED;


    public boolean admitsPublishing() {
        return this == COMPLETED;
    }


    public Optional<ItineraryState> next() {
        return switch (this) {
            case UPCOMING -> Optional.of(ONGOING);
            case ONGOING -> Optional.of(COMPLETED);
            case COMPLETED -> Optional.empty();
        };
    }


    public Optional<ItineraryState> previous() {
        return switch (this) {
            case UPCOMING -> Optional.empty();
            case ONGOING -> Optional.of(UPCOMING);
            case COMPLETED -> Optional.of(ONGOING);
        };
    }


    public static Optional<ItineraryState> parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(wireName.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException unknown) {
            return Optional.empty();
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
