package com.largata.common.authz;

import java.util.UUID;


public record Membership(UUID travelerId, UUID itineraryId, Role role) {

    public Membership {
        if (travelerId == null || itineraryId == null || role == null) {
            throw new IllegalArgumentException("A membership names a traveler, an itinerary and a role");
        }
    }

    public boolean isOwner() {
        return role == Role.OWNER;
    }
}
