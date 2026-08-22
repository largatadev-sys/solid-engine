package com.largata.join;

import java.time.Instant;
import java.util.UUID;


public record PendingJoinRequest(
        UUID id,
        UUID travelerId,
        String displayName,
        String handle,
        String avatarUrl,
        Instant requestedAt) {}
