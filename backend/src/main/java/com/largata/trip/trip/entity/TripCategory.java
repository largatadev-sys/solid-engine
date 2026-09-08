package com.largata.trip.trip.entity;

import java.util.Locale;
import java.util.Optional;
import com.largata.trip.api.TripLifecycle;
import com.largata.trip.trip.exception.UnknownTripCategoryException;


public enum TripCategory {
    DRAFT(null),
    UPCOMING(TripLifecycle.UPCOMING),
    ONGOING(TripLifecycle.ONGOING),
    COMPLETE(TripLifecycle.COMPLETED);

    private final TripLifecycle state;

    TripCategory(TripLifecycle state) {
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


    public Optional<TripLifecycle> state() {
        return Optional.ofNullable(state);
    }


    public boolean matchesNoState() {
        return state == null;
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
