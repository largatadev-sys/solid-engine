package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum Visibility {
    PUBLIC;


    public static Visibility audience(String wireName) {
        return parse(wireName).orElse(PUBLIC);
    }


    public static Optional<Visibility> parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return Optional.empty();
        }
        String given = wireName.strip().toUpperCase(Locale.ROOT);
        if (PUBLIC.name().equals(given)) {
            return Optional.of(PUBLIC);
        }
        if ("PRIVATE".equals(given)) {
            throw new VisibilityRetiredException();
        }
        throw new UnknownAudienceException(wireName);
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
