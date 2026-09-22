package com.largata.trip.room;

import com.largata.trip.exception.ItineraryNotFoundException;
import java.util.UUID;
import java.util.function.Supplier;


public final class TripFence {

    private final ArchiveState room;
    private final PublicationState publication;

    public TripFence(ArchiveState room, PublicationState publication) {
        if (room == null || publication == null) {
            throw new IllegalArgumentException("A fence is two facts about a trip, and nothing else");
        }
        this.room = room;
        this.publication = publication;
    }


    public void requireOpenRoom(UUID tripId) {
        requireOpenRoom(tripId, ItineraryNotFoundException::new);
    }


    public void requireOpenRoom(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        requireBoth(tripId, refusal);
        if (room.isArchived(tripId)) {
            throw refusal.get();
        }
    }


    public void requireUnfrozen(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        requireBoth(tripId, refusal);
        if (publication.isPublished(tripId)) {
            throw refusal.get();
        }
    }


    private static void requireBoth(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        if (tripId == null || refusal == null) {
            throw new IllegalArgumentException("An act on a trip names the trip and its refusal");
        }
    }
}
