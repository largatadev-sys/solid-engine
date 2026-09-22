package com.largata.trip.room;

import java.util.UUID;


public record Membership(UUID travelerId, UUID itineraryId, Role role) implements Standing {

    public Membership {
        if (travelerId == null || itineraryId == null || role == null) {
            throw new IllegalArgumentException("A membership names a traveler, an itinerary and a role");
        }
    }

    public boolean isOwner() {
        return role == Role.OWNER;
    }


    @Override
    public Membership membership() {
        return this;
    }
}
