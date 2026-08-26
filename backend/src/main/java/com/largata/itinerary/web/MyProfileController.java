package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.FollowCounts;
import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.TripStats;
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
    private final FollowService follows;

    MyProfileController(ItineraryService itineraries, FollowService follows) {
        this.itineraries = itineraries;
        this.follows = follows;
    }


    @GetMapping("/stats")
    ProfileStatsResponse stats(@CurrentTraveler Traveler traveler) {
        TripStats trips = itineraries.tripStatsFor(traveler.id());
        FollowCounts counts = follows.countsOf(traveler.id());
        return new ProfileStatsResponse(
                trips.publishedCount(),
                trips.destinationCount(),
                counts.followersCount(),
                counts.followingCount());
    }


    @GetMapping("/published")
    Page<ShowcaseItineraryResponse> published(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return itineraries.listMyShowcase(traveler.id(), cursor, limit);
    }
}
