package com.largata.invitation;

import com.largata.common.authz.Role;
import java.time.Instant;
import java.util.UUID;


public record MemberSummary(
        UUID travelerId,
        String displayName,
        String avatarUrl,
        Role role,
        Instant joinedAt,
        String handle,
        String bio,
        String vanityNumber) {}
