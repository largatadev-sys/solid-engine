package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.AuthoredContentAudience;
import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.identity.api.PublicProfileResponse;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.PublicProfileService;
import com.largata.itinerary.api.DiaryTripResponse;
import com.largata.itinerary.api.ShowcaseItineraryResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/travelers/{handle}")
class PublicProfileController {

    private final PublicProfileService profiles;
    private final FollowService follows;
    private final AuthoredContentAudience audience;

    PublicProfileController(
            PublicProfileService profiles, FollowService follows, AuthoredContentAudience audience) {
        this.profiles = profiles;
        this.follows = follows;
        this.audience = audience;
    }


    @GetMapping
    PublicProfileResponse profile(@CurrentTraveler Traveler traveler, @PathVariable String handle) {
        return profiles.byHandle(handle, traveler.id());
    }


    @GetMapping("/published")
    Page<ShowcaseItineraryResponse> published(
            @CurrentTraveler Traveler traveler,
            @PathVariable String handle,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return profiles.showcaseOf(handle, cursor, limit);
    }


    @GetMapping("/diary/trips")
    Page<DiaryTripResponse> diaryTrips(
            @CurrentTraveler Traveler traveler,
            @PathVariable String handle,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        requireAudience(traveler, handle);
        return profiles.diaryTripsOf(handle, cursor, limit);
    }


    @GetMapping("/followers")
    Page<TravelerCardResponse> followers(
            @CurrentTraveler Traveler traveler,
            @PathVariable String handle,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        requireAudience(traveler, handle);
        return follows.followersOf(handle, cursor, limit);
    }


    @GetMapping("/following")
    Page<TravelerCardResponse> following(
            @CurrentTraveler Traveler traveler,
            @PathVariable String handle,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        requireAudience(traveler, handle);
        return follows.followingOf(handle, cursor, limit);
    }


    private void requireAudience(Traveler viewer, String handle) {
        audience.requireReadable(viewer.id(), follows.onboardedIdByHandle(handle));
    }
}
