package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.PostcardFeedService;
import com.largata.itinerary.api.FeedPostcardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/feed/postcards")
class PostcardFeedController {

    private final PostcardFeedService feed;

    PostcardFeedController(PostcardFeedService feed) {
        this.feed = feed;
    }


    @GetMapping
    Page<FeedPostcardResponse> page(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return feed.page(cursor, limit);
    }
}
