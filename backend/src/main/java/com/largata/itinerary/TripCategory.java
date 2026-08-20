package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum TripCategory {
    DRAFT(null),
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


    Optional<ItineraryState> state() {
        return Optional.ofNullable(state);
    }


    boolean matchesNoState() {
        return state == null;
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
