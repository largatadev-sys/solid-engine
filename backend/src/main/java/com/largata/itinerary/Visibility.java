package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum Visibility {
    PUBLIC,
    PRIVATE;


    public boolean isVisibleToEveryone() {
        return this == PUBLIC;
    }


    public static Visibility audience(String wireName) {
        return parse(wireName).orElse(PUBLIC);
    }


    public static Optional<Visibility> parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(wireName.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException unknown) {
            throw new UnknownAudienceException(wireName);
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
