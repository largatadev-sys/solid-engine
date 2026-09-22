package com.largata.join.join.controller;

import static com.largata.trip.room.Door.Rule.MEMBERSHIP_MUTABLE;

import com.largata.common.api.Page;
import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.Owner;
import com.largata.trip.exception.NotTheTripOwnerException;
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

    TripJoinController(JoinService join) {
        this.join = join;
    }


    @GetMapping("/join-link")
    @Door(MEMBERSHIP_MUTABLE)
    JoinLinkResponse link(@CurrentMember Membership member) {
        return JoinLinkResponse.of(join.linkFor(member));
    }


    @GetMapping("/join-requests")
    @Door(MEMBERSHIP_MUTABLE)
    Page<JoinRequestSummaryResponse> queue(@CurrentMember Membership member) {
        return Page.exhausted(
                join.queueFor(Owner.of(member, NotTheTripOwnerException::toReadTheJoinQueue)).stream()
                        .map(JoinRequestSummaryResponse::of)
                        .toList());
    }


    @PostMapping("/join-requests/{requestId}/approve")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void approve(@CurrentMember Membership member, @PathVariable UUID requestId) {
        join.approve(theOwnerAnswering(member), requestId);
    }


    @PostMapping("/join-requests/{requestId}/decline")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(@CurrentMember Membership member, @PathVariable UUID requestId) {
        join.decline(theOwnerAnswering(member), requestId);
    }


    private static Owner theOwnerAnswering(Membership member) {
        return Owner.of(member, NotTheTripOwnerException::toAnswerAJoinRequest);
    }
}
