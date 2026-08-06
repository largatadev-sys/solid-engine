package com.largata.invitation.web;

import com.largata.invitation.MemberSummary;
import java.time.Instant;
import java.util.UUID;


public record MemberResponse(
        UUID travelerId,
        String displayName,
        String avatarUrl,
        String role,
        Instant joinedAt,
        boolean ownershipOffered) {


    public static MemberResponse of(MemberSummary m) {
        return of(m, false);
    }

    public static MemberResponse of(MemberSummary m, boolean ownershipOffered) {
        return new MemberResponse(
                m.travelerId(),
                m.displayName(),
                m.avatarUrl(),
                m.role().name().toLowerCase(java.util.Locale.ROOT),
                m.joinedAt(),
                ownershipOffered);
    }
}
