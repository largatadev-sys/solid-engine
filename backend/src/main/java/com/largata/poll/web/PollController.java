package com.largata.poll.web;

import com.largata.common.authz.AudienceFence;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.poll.PollService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/polls")
class PollController {

    private final PollService polls;
    private final AuthorizationGuard guard;
    private final AudienceFence audience;

    PollController(PollService polls, AuthorizationGuard guard, AudienceFence audience) {
        this.polls = polls;
        this.guard = guard;
        this.audience = audience;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PollResponse ask(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody CreatePollRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(
                polls.ask(member, request.question(), request.options(), request.closesAt()));
    }


    @GetMapping
    PollBoardResponse board(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollBoardResponse.of(polls.board(audience.requireInAudience(member)));
    }


    @PutMapping("/{pollId}/vote")
    PollResponse vote(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId,
            @Valid @RequestBody CastVoteRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(polls.vote(member, pollId, request.optionId()));
    }


    @PostMapping("/{pollId}/close")
    PollResponse close(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(polls.close(member, pollId));
    }


    @DeleteMapping("/{pollId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        polls.delete(member, pollId);
    }
}
