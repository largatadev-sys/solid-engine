package com.largata.poll.web;

import com.largata.poll.PollOptionView;
import java.util.List;
import java.util.UUID;


public record PollOptionResponse(UUID id, String label, int voteCount, List<PollVoterResponse> voters) {

    static PollOptionResponse of(PollOptionView option) {
        return new PollOptionResponse(
                option.id(),
                option.label(),
                option.voteCount(),
                option.voters().stream().map(PollVoterResponse::of).toList());
    }
}
