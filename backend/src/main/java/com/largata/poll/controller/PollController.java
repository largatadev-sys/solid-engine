package com.largata.poll.controller;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
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

    PollController(PollService polls) {
        this.polls = polls;
    }


    @PostMapping
    @Door(OPEN)
    @ResponseStatus(HttpStatus.CREATED)
    PollResponse ask(@CurrentMember Membership member, @Valid @RequestBody CreatePollRequest request) {
        return PollResponse.of(polls.ask(member, request.question(), request.options(), request.closesAt()));
    }


    @GetMapping
    PollBoardResponse board(@CurrentMember Membership member) {
        return PollBoardResponse.of(polls.board(member));
    }


    @PutMapping("/{pollId}/vote")
    @Door(OPEN)
    PollResponse vote(
            @CurrentMember Membership member, @PathVariable UUID pollId, @Valid @RequestBody CastVoteRequest request) {
        return PollResponse.of(polls.vote(member, pollId, request.optionId()));
    }


    @PostMapping("/{pollId}/close")
    @Door(OPEN)
    PollResponse close(@CurrentMember Membership member, @PathVariable UUID pollId) {
        return PollResponse.of(polls.close(member, pollId));
    }


    @DeleteMapping("/{pollId}")
    @Door(OPEN)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentMember Membership member, @PathVariable UUID pollId) {
        polls.delete(member, pollId);
    }
}
