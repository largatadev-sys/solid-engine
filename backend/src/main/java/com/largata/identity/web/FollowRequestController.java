package com.largata.identity.web;

import com.largata.common.api.Page;
import com.largata.identity.FollowRequestService;
import com.largata.identity.FollowService;
import com.largata.identity.Traveler;
import com.largata.identity.api.FollowRequestResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/me")
class FollowRequestController {

    private final FollowRequestService requests;
    private final FollowService follows;

    FollowRequestController(FollowRequestService requests, FollowService follows) {
        this.requests = requests;
        this.follows = follows;
    }


    @GetMapping("/follow-requests")
    Page<FollowRequestResponse> inbox(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return requests.inboxOf(traveler.id(), cursor, limit);
    }


    @PostMapping("/follow-requests/{travelerId}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approve(@CurrentTraveler Traveler traveler, @PathVariable UUID travelerId) {
        requests.approve(traveler.id(), travelerId);
    }


    @PostMapping("/follow-requests/{travelerId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(@CurrentTraveler Traveler traveler, @PathVariable UUID travelerId) {
        requests.decline(traveler.id(), travelerId);
    }


    @DeleteMapping("/followers/{travelerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeFollower(@CurrentTraveler Traveler traveler, @PathVariable UUID travelerId) {
        follows.removeFollower(traveler.id(), travelerId);
    }
}
