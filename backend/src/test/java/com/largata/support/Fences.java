package com.largata.support;

import com.largata.trip.room.PublicationState;
import com.largata.trip.room.TripFence;
import java.util.Optional;
import java.util.UUID;


public final class Fences {

    private Fences() {}


    public static TripFence fence(boolean archived, boolean published) {
        return new TripFence(tripId -> archived, publication(published));
    }


    public static PublicationState publication(boolean published) {
        return new PublicationState() {
            @Override
            public boolean isPublished(UUID tripId) {
                return published;
            }

            @Override
            public Optional<LivePublication> liveFor(UUID tripId) {
                return Optional.empty();
            }
        };
    }
}
