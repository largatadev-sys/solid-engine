package com.largata.itinerary;


public enum Visibility {
    PRIVATE,
    UNLISTED,
    PUBLIC;


    public String wireName() {
        return name().toLowerCase();
    }
}
