package com.largata.trip;

import java.util.Locale;
import java.util.Optional;


public enum TripLifecycle {
    UPCOMING,
    ONGOING,
    COMPLETED;


    public boolean admitsPublishing() {
        return this == COMPLETED;
    }


    public boolean hasStarted() {
        return this == ONGOING || this == COMPLETED;
    }


    public static Optional<TripLifecycle> parse(String storedName) {
        if (storedName == null || storedName.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(storedName.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException unknown) {
            return Optional.empty();
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
