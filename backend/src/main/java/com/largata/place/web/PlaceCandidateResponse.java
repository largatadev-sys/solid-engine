package com.largata.place.web;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.place.api.PlaceCandidate;
import java.math.BigDecimal;


record PlaceCandidateResponse(
        String name,
        String context,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lat,
        @JsonFormat(shape = JsonFormat.Shape.NUMBER) BigDecimal lng,
        String kind) {


    static PlaceCandidateResponse of(PlaceCandidate candidate) {
        return new PlaceCandidateResponse(
                candidate.name(),
                candidate.context(),
                candidate.latitude(),
                candidate.longitude(),
                candidate.kind());
    }
}
