package com.largata.invitation.web;

import com.largata.invitation.MemberSummary;
import java.time.Instant;
import java.util.UUID;

/**
 * A workspace member on the wire (S1.2). {@code role} is lower-cased at the boundary — the API's
 * spelling ({@code owner}/{@code member}), distinct from the enum's storage name, the way {@code
 * ItineraryState.wireName()} lower-cases {@code state}.
 */
public record MemberResponse(UUID travelerId, String displayName, String role, Instant joinedAt) {

    public static MemberResponse of(MemberSummary m) {
        return new MemberResponse(
                m.travelerId(), m.displayName(), m.role().name().toLowerCase(java.util.Locale.ROOT), m.joinedAt());
    }
}
