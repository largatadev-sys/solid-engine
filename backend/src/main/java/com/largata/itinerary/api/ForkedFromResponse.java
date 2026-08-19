package com.largata.itinerary.api;

import com.largata.itinerary.ForkService;
import java.util.UUID;


public record ForkedFromResponse(UUID sourceItineraryId, String ownerHandle, boolean sourceVisible) {


    public static ForkedFromResponse of(ForkService.ForkProvenance provenance) {
        return provenance == null
                ? null
                : new ForkedFromResponse(
                        provenance.sourceItineraryId(), provenance.ownerHandle(), provenance.sourceVisible());
    }
}
