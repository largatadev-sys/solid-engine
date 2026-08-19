package com.largata.poll;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class PollVoteInserter {

    private final PollVoteRepository votes;

    PollVoteInserter(PollVoteRepository votes) {
        this.votes = votes;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void insert(UUID pollId, UUID optionId, UUID workspaceId, UUID travelerId, Instant at) {
        votes.saveAndFlush(PollVote.cast(pollId, optionId, workspaceId, travelerId, at));
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    boolean moveExisting(UUID pollId, UUID workspaceId, UUID travelerId, UUID optionId, Instant at) {
        return votes.findByPollIdAndWorkspaceIdAndTravelerId(pollId, workspaceId, travelerId)
                .map(
                        vote -> {
                            vote.moveTo(optionId, at);
                            votes.saveAndFlush(vote);
                            return true;
                        })
                .orElse(false);
    }
}
