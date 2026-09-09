package com.largata.profile.web;

import com.largata.common.api.Page;
import com.largata.identity.FollowCounts;
import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.profile.api.ProfileStatsResponse;
import com.largata.profile.api.ShowcaseItineraryResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.largata.profile.PublicProfileService;


@RestController
@RequestMapping("/v1/me/profile")
class MyProfileController {

    private final PublicProfileService profiles;
    private final FollowService follows;

    MyProfileController(PublicProfileService profiles, FollowService follows) {
        this.profiles = profiles;
        this.follows = follows;
    }


    @GetMapping("/stats")
    ProfileStatsResponse stats(@CurrentTraveler Traveler traveler) {
        PublicProfileService.ProfileCounts trips = profiles.countsFor(traveler.id());
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
        return profiles.myShowcase(traveler.id(), cursor, limit);
    }
}
