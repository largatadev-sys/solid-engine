package com.largata.trip.api;

import java.time.Instant;
import java.util.UUID;


public record EditingSessionChanged(UUID tripId, Holder holder) {

    public static EditingSessionChanged released(UUID tripId) {
        return new EditingSessionChanged(tripId, null);
    }


    public record Holder(
            UUID travelerId, String handle, String displayName, String avatarUrl, Instant expiresAt) {}
}
