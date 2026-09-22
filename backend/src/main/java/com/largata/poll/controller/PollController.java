package com.largata.poll.controller;

import com.largata.trip.room.TripFence;
import com.largata.trip.room.AuthorizationGuard;
import com.largata.trip.room.Membership;
import com.largata.common.security.CurrentTraveler;
import com.largata.identity.Traveler;
import com.largata.poll.dto.CastVoteRequest;
import com.largata.poll.dto.CreatePollRequest;
import com.largata.poll.dto.PollBoardResponse;
import com.largata.poll.dto.PollResponse;
import com.largata.poll.service.PollService;
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
@RequestMapping("/v1/trips/{itineraryId}/polls")
class PollController {

    private final PollService polls;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    PollController(PollService polls, AuthorizationGuard guard, TripFence fence) {
        this.polls = polls;
        this.guard = guard;
        this.fence = fence;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PollResponse ask(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody CreatePollRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(
                polls.ask(
                        fence.writable(member),
                        request.question(),
                        request.options(),
                        request.closesAt()));
    }


    @GetMapping
    PollBoardResponse board(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollBoardResponse.of(polls.board(fence.inAudience(member)));
    }


    @PutMapping("/{pollId}/vote")
    PollResponse vote(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId,
            @Valid @RequestBody CastVoteRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(polls.vote(fence.writable(member), pollId, request.optionId()));
    }


    @PostMapping("/{pollId}/close")
    PollResponse close(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PollResponse.of(polls.close(fence.writable(member), pollId));
    }


    @DeleteMapping("/{pollId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID pollId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        polls.delete(fence.writable(member), pollId);
    }
}
