package com.largata.join.join.controller;

import com.largata.common.api.Page;
import com.largata.trip.api.AuthorizationGuard;
import com.largata.trip.api.Membership;
import com.largata.trip.api.Owner;
import com.largata.trip.api.TripFence;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.common.security.CurrentTraveler;
import com.largata.identity.Traveler;
import com.largata.join.join.dto.JoinLinkResponse;
import com.largata.join.join.dto.JoinRequestSummaryResponse;
import com.largata.join.join.service.JoinService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips/{itineraryId}")
class TripJoinController {

    private final JoinService join;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    TripJoinController(JoinService join, AuthorizationGuard guard, TripFence fence) {
        this.join = join;
        this.guard = guard;
        this.fence = fence;
    }


    @GetMapping("/join-link")
    JoinLinkResponse link(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return JoinLinkResponse.of(join.linkFor(fence.membershipMutable(membership)));
    }


    @GetMapping("/join-requests")
    Page<JoinRequestSummaryResponse> queue(
            @CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return Page.exhausted(
                join.queueFor(theOwnerOfTheQueue(membership)).stream()
                        .map(JoinRequestSummaryResponse::of)
                        .toList());
    }


    @PostMapping("/join-requests/{requestId}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approve(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID requestId) {
        join.approve(theOwnerAnswering(guard.requireMember(traveler.id(), itineraryId)), requestId);
    }


    @PostMapping("/join-requests/{requestId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID requestId) {
        join.decline(theOwnerAnswering(guard.requireMember(traveler.id(), itineraryId)), requestId);
    }

    private TripFence.MembershipMutable<Owner> theOwnerOfTheQueue(Membership membership) {
        return fence.membershipMutable(
                fence.owner(membership, NotTheTripOwnerException::toReadTheJoinQueue));
    }


    private TripFence.MembershipMutable<Owner> theOwnerAnswering(Membership membership) {
        return fence.membershipMutable(
                fence.owner(membership, NotTheTripOwnerException::toAnswerAJoinRequest));
    }
}
