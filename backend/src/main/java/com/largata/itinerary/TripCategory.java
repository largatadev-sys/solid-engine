package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum TripCategory {
    DRAFT(ItineraryState.DRAFT),
    UPCOMING(ItineraryState.UPCOMING),
    ONGOING(ItineraryState.ONGOING),
    COMPLETE(ItineraryState.COMPLETED);

    private final ItineraryState state;

    TripCategory(ItineraryState state) {
        this.state = state;
    }


    public static Optional<TripCategory> parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(wireName.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException unknown) {
            throw new UnknownTripCategoryException(wireName);
        }
    }


    ItineraryState state() {
        return state;
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
