package com.largata.poll.web;

import com.largata.poll.PollView;
import java.time.Instant;
import java.util.List;
import java.util.UUID;


public record PollResponse(
        UUID id,
        String question,
        UUID createdBy,
        boolean mine,
        String status,
        Instant closesAt,
        Instant closedAt,
        Instant createdAt,
        List<PollOptionResponse> options,
        List<UUID> winningOptionIds,
        UUID myVoteOptionId,
        int votedCount,
        int memberCount) {

    static final String OPEN = "open";

    static final String CLOSED = "closed";


    public static PollResponse of(PollView poll) {
        return new PollResponse(
                poll.id(),
                poll.question(),
                poll.createdBy(),
                poll.mine(),
                poll.closed() ? CLOSED : OPEN,
                poll.closesAt(),
                poll.closedAt(),
                poll.createdAt(),
                poll.options().stream().map(PollOptionResponse::of).toList(),
                poll.winningOptionIds(),
                poll.myVoteOptionId(),
                poll.votedCount(),
                poll.memberCount());
    }
}
