package com.largata.place.web;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.ResolvedPlace;
import java.math.BigDecimal;


record PlaceCandidateResponse(
        String name,
        String context,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lat,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lng,
        String kind,
        boolean nearby) {


    static PlaceCandidateResponse of(ResolvedPlace resolved) {
        PlaceCandidateResponse found = of(resolved.place());
        return found == null ? null : new PlaceCandidateResponse(
                found.name(), found.context(), found.lat(), found.lng(), found.kind(), resolved.nearby());
    }


    static PlaceCandidateResponse of(PlaceCandidate candidate) {
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
