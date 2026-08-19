package com.largata.poll.web;

import com.largata.poll.PollVoterSummary;
import java.util.UUID;


public record PollVoterResponse(UUID travelerId, String displayName, String avatarUrl, String handle) {

    static PollVoterResponse of(PollVoterSummary voter) {
        return new PollVoterResponse(
                voter.travelerId(), voter.displayName(), voter.avatarUrl(), voter.handle());
    }
}
