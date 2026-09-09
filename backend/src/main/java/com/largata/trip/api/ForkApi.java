package com.largata.trip.api;

import java.util.Optional;
import java.util.UUID;

public interface ForkApi {

    Optional<ForkProvenanceView> provenanceOf(UUID tripId, UUID readerId);

    long forkCountOf(UUID sourceTripId);

    void recordFork(UUID sourceId, UUID forkedTripId);

    interface SourceVisibility {

        boolean stillLive(UUID sourceId);
    }


    record ForkProvenanceView(UUID sourceTripId, String ownerHandle, boolean sourceVisible) {}
}
