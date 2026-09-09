package com.largata.trip.fork;

import com.largata.trip.api.ForkApi;
import java.util.UUID;


public record ForkedFromResponse(UUID sourceItineraryId, String ownerHandle, boolean sourceVisible) {


    public static ForkedFromResponse of(ForkApi.ForkProvenanceView provenance) {
        return provenance == null
                ? null
                : new ForkedFromResponse(
                        provenance.sourceTripId(), provenance.ownerHandle(), provenance.sourceVisible());
    }
}
