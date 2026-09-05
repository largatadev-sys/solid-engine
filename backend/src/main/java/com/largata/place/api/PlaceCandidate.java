package com.largata.place.api;

import java.math.BigDecimal;


public record PlaceCandidate(String name, String context, BigDecimal latitude, BigDecimal longitude, String kind) {

    public PlaceCandidate {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("A place candidate needs a name a traveler can read");
        }
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("A place candidate needs a point");
        }
        name = name.strip();
        context = context == null || context.isBlank() ? null : context.strip();
        kind = kind == null || kind.isBlank() ? null : kind.strip();
    }
}
