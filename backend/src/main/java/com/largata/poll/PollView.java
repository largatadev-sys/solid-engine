package com.largata.poll;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


public record PollView(
        UUID id,
        String question,
        UUID createdBy,
        Instant closesAt,
        Instant closedAt,
        Instant createdAt,
        boolean closed,
        List<PollOptionView> options,
        List<UUID> winningOptionIds,
        UUID myVoteOptionId,
        int votedCount,
        int memberCount,
        boolean mine) {}
