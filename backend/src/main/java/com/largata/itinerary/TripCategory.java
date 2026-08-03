package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum TripCategory {
    DRAFT(ItineraryStatus.DRAFT),
    PRIVATE(ItineraryStatus.PRIVATE),
    PUBLIC(ItineraryStatus.PUBLIC);

    private final ItineraryStatus status;

    TripCategory(ItineraryStatus status) {
        this.status = status;
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


    ItineraryStatus status() {
        return status;
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
