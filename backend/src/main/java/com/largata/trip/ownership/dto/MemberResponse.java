package com.largata.trip.ownership.dto;

import com.largata.trip.ownership.service.MemberSummary;
import java.time.Instant;
import java.util.UUID;


public record MemberResponse(
        UUID travelerId,
        String displayName,
        String avatarUrl,
        String role,
        Instant joinedAt,
        boolean ownershipOffered,
        String handle,
        String bio,
        String vanityNumber) {


    public static MemberResponse of(MemberSummary m, boolean ownershipOffered) {
        return new MemberResponse(
                m.travelerId(),
                m.displayName(),
                m.avatarUrl(),
                m.role().wireName(),
                m.joinedAt(),
                ownershipOffered,
                m.handle(),
                m.bio(),
                m.vanityNumber());
    }
}
