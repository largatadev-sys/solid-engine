package com.largata.trip.ownership.service;

import com.largata.trip.api.Role;
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
