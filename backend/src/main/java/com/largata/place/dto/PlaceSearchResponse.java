package com.largata.place.dto;

import java.util.List;


public record PlaceSearchResponse(List<PlaceCandidateResponse> results) {
}
