package com.largata.itinerary;

import java.math.BigDecimal;
import java.math.RoundingMode;


public record Pin(BigDecimal latitude, BigDecimal longitude, int zoom) {

    public static final int MIN_ZOOM = 2;

    public static final int MAX_ZOOM = 19;

    static final int STORED_SCALE = 6;

    public Pin {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("A pin is a point: it needs both a latitude and a longitude");
        }
        latitude = onEarth(latitude, 90, "latitude");
        longitude = onEarth(longitude, 180, "longitude");

        if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
            throw new IllegalArgumentException(
                    "A pin's zoom is between " + MIN_ZOOM + " and " + MAX_ZOOM);
        }
    }


    static Pin readFrom(BigDecimal latitude, BigDecimal longitude, Short zoom) {
        if (latitude == null || longitude == null || zoom == null) {
            return null;
        }
        return new Pin(latitude, longitude, zoom);
    }


    private static BigDecimal onEarth(BigDecimal value, int limit, String field) {
        if (value.abs().compareTo(BigDecimal.valueOf(limit)) > 0) {
            throw new IllegalArgumentException("A pin's " + field + " is between -" + limit + " and " + limit);
        }
        return value.setScale(STORED_SCALE, RoundingMode.HALF_UP);
    }
}
