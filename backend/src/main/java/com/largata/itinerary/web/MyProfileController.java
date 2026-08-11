package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.api.ProfileStatsResponse;
import com.largata.itinerary.api.ShowcaseItineraryResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/me/profile")
class MyProfileController {

    private final ItineraryService itineraries;

    MyProfileController(ItineraryService itineraries) {
        this.itineraries = itineraries;
    }


    @GetMapping("/stats")
    ProfileStatsResponse stats(@CurrentTraveler Traveler traveler) {
        return itineraries.statsFor(traveler.id());
    }


    @GetMapping("/published")
    Page<ShowcaseItineraryResponse> published(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return itineraries.listMyShowcase(traveler.id(), cursor, limit);
    }
}
