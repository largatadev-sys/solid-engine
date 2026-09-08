package com.largata.trip.fork;

import com.largata.trip.fork.ForkService;
import java.util.UUID;


public record ForkedFromResponse(UUID sourceItineraryId, String ownerHandle, boolean sourceVisible) {


    public static ForkedFromResponse of(ForkService.ForkProvenance provenance) {
        return provenance == null
                ? null
                : new ForkedFromResponse(
                        provenance.sourceItineraryId(), provenance.ownerHandle(), provenance.sourceVisible());
    }
}
