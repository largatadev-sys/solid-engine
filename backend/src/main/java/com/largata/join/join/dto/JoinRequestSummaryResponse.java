package com.largata.join.join.dto;

import com.largata.join.join.service.PendingJoinRequest;
import java.time.Instant;
import java.util.UUID;


public record JoinRequestSummaryResponse(
        UUID id,
        UUID travelerId,
        String displayName,
        String handle,
        String avatarUrl,
        Instant requestedAt) {

    public static JoinRequestSummaryResponse of(PendingJoinRequest request) {
        return new JoinRequestSummaryResponse(
                request.id(),
                request.travelerId(),
                request.displayName(),
                request.handle(),
                request.avatarUrl(),
                request.requestedAt());
    }
}
