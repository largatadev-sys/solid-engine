package com.largata.place.web;

import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.place.PlaceSearchService;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/places")
class PlaceSearchController {

    private final PlaceSearchService places;

    PlaceSearchController(PlaceSearchService places) {
        this.places = places;
    }


    @GetMapping("/search")
    PlaceSearchResponse search(
            @CurrentTraveler Traveler traveler,
            @RequestParam("q") String query,
            @RequestParam(name = "lat", required = false) BigDecimal biasLatitude,
            @RequestParam(name = "lng", required = false) BigDecimal biasLongitude) {
        List<PlaceCandidateResponse> results =
                places.search(traveler.id(), query, biasLatitude, biasLongitude).stream()
                        .map(PlaceCandidateResponse::of)
                        .toList();
        return new PlaceSearchResponse(results);
    }

    @GetMapping("/reverse")
    PlaceCandidateResponse resolve(
            @CurrentTraveler Traveler traveler,
            @RequestParam("lat") BigDecimal latitude,
            @RequestParam("lng") BigDecimal longitude) {
        return PlaceCandidateResponse.of(places.resolve(traveler.id(), latitude, longitude));
    }
}
