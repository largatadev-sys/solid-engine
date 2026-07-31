package com.largata.itinerary;


public enum Visibility {
    PRIVATE,
    PUBLISHED;


    public boolean isPublished() {
        return this == PUBLISHED;
    }


    public String wireName() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
