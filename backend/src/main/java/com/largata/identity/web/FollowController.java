package com.largata.identity.web;

import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.identity.api.FollowStateResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/travelers/{travelerId}/follow")
class FollowController {

    private final FollowService follows;

    FollowController(FollowService follows) {
        this.follows = follows;
    }


    @PostMapping
    FollowStateResponse follow(@CurrentTraveler Traveler traveler, @PathVariable UUID travelerId) {
        return follows.follow(traveler.id(), travelerId);
    }


    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unfollow(@CurrentTraveler Traveler traveler, @PathVariable UUID travelerId) {
        follows.unfollow(traveler.id(), travelerId);
    }
}
