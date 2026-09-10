package com.largata.place.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.place.service.PlaceCandidate;
import com.largata.place.service.ResolvedPlace;
import java.math.BigDecimal;


public record PlaceCandidateResponse(
        String name,
        String context,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lat,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lng,
        String kind,
        boolean nearby) {


    public static PlaceCandidateResponse of(ResolvedPlace resolved) {
        PlaceCandidateResponse found = of(resolved.place());
        return found == null ? null : new PlaceCandidateResponse(
                found.name(), found.context(), found.lat(), found.lng(), found.kind(), resolved.nearby());
    }


    public static PlaceCandidateResponse of(PlaceCandidate candidate) {
        if (candidate == null) {
            return null;
        }
        return new PlaceCandidateResponse(
                candidate.name(),
                candidate.context(),
                candidate.latitude(),
                candidate.longitude(),
                candidate.kind(),
                false);
    }
}
