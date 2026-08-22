package com.largata.join.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.join.JoinService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}")
class TripJoinController {

    private final JoinService join;
    private final AuthorizationGuard guard;

    TripJoinController(JoinService join, AuthorizationGuard guard) {
        this.join = join;
        this.guard = guard;
    }


    @GetMapping("/join-link")
    JoinLinkResponse link(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return JoinLinkResponse.of(join.linkFor(membership));
    }


    @GetMapping("/join-requests")
    Page<JoinRequestSummaryResponse> queue(
            @CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return Page.exhausted(
                join.queueFor(membership).stream().map(JoinRequestSummaryResponse::of).toList());
    }


    @PostMapping("/join-requests/{requestId}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approve(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID requestId) {
        join.approve(guard.requireMember(traveler.id(), itineraryId), requestId);
    }


    @PostMapping("/join-requests/{requestId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID requestId) {
        join.decline(guard.requireMember(traveler.id(), itineraryId), requestId);
    }
}
