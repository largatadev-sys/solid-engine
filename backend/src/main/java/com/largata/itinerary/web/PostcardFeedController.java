package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.PostcardFeedService;
import com.largata.itinerary.api.FeedPostcardResponse;
import com.largata.itinerary.api.PublicTripDiaryResponse;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/feed/postcards")
class PostcardFeedController {

    private static final String FOLLOWING_SCOPE = "following";

    private final PostcardFeedService feed;
    private final FollowService follows;

    PostcardFeedController(PostcardFeedService feed, FollowService follows) {
        this.feed = feed;
        this.follows = follows;
    }


    @GetMapping
    Page<FeedPostcardResponse> page(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String scope) {
        if (!FOLLOWING_SCOPE.equals(scope)) {
            return feed.page(cursor, limit);
        }
        return feed.page(cursor, limit, follows.followeeIdsOf(traveler.id()));
    }


    @GetMapping("/trips/{itineraryId}/by/{authorId}")
    PublicTripDiaryResponse tripDiary(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID authorId) {
        return feed.tripDiary(itineraryId, authorId);
    }
}
