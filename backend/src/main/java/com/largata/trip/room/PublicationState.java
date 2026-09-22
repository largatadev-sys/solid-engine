package com.largata.trip.room;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;


public interface PublicationState {


    boolean isPublished(UUID tripId);


    Optional<LivePublication> liveFor(UUID tripId);


    record LivePublication(UUID itineraryId, Instant publishedAt) {}
}
