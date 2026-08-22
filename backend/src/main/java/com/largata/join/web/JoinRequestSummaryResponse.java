package com.largata.join.web;

import com.largata.join.PendingJoinRequest;
import java.time.Instant;
import java.util.UUID;


public record JoinRequestSummaryResponse(
        UUID id,
        UUID travelerId,
        String displayName,
        String handle,
        String avatarUrl,
        Instant requestedAt) {

    static JoinRequestSummaryResponse of(PendingJoinRequest request) {
        return new JoinRequestSummaryResponse(
                request.id(),
                request.travelerId(),
                request.displayName(),
                request.handle(),
                request.avatarUrl(),
                request.requestedAt());
    }
}
