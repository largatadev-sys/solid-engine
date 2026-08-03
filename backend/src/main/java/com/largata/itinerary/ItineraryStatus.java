package com.largata.itinerary;

import java.util.Locale;
import java.util.Optional;


public enum ItineraryStatus {
    DRAFT,
    PRIVATE,
    PUBLIC;


    public boolean isPublished() {
        return this != DRAFT;
    }


    public boolean isEditable() {
        return this == DRAFT;
    }


    public boolean isVisibleToEveryone() {
        return this == PUBLIC;
    }


    public static ItineraryStatus audience(String wireName) {
        ItineraryStatus requested = parse(wireName).orElse(PUBLIC);
        if (requested == DRAFT) {
            throw new UnknownAudienceException(wireName);
        }
        return requested;
    }


    public static Optional<ItineraryStatus> parse(String wireName) {
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
