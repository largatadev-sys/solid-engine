package com.largata.itinerary;


public enum ItineraryState {
    DRAFT,
    ACTIVE,
    COMPLETED,
    PUBLISHED;


    public String wireName() {
        return name().toLowerCase();
    }
}
