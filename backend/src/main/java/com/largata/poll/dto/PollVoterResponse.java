package com.largata.poll.dto;

import com.largata.poll.service.PollVoterSummary;
import java.util.UUID;


public record PollVoterResponse(UUID travelerId, String displayName, String avatarUrl, String handle) {

    static PollVoterResponse of(PollVoterSummary voter) {
        return new PollVoterResponse(
                voter.travelerId(), voter.displayName(), voter.avatarUrl(), voter.handle());
    }
}
