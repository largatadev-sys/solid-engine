package com.largata.invitation.web;

import com.largata.invitation.MemberSummary;
import java.time.Instant;
import java.util.UUID;

/**
 * A workspace member on the wire (S1.2). {@code role} is lower-cased at the boundary — the API's
 * spelling ({@code owner}/{@code member}), distinct from the enum's storage name, the way {@code
 * ItineraryState.wireName()} lower-cases {@code state}.
 *
 * <p><strong>{@code ownershipOffered} is S1.6's one additive field</strong> (ADR-008): true on the row
 * of the member currently holding a pending ownership offer, false on everyone else, and — since at
 * most one offer may be pending per trip — true on at most one row of any response. It rides the roster
 * rather than arriving from a new endpoint because the roster is already fetched by both screens that
 * need it, and both UI questions ("who has been offered?" and "is it me?") are answered by the same
 * flag read from a different row. Old clients ignore an unknown field.
 */
public record MemberResponse(
        UUID travelerId, String displayName, String role, Instant joinedAt, boolean ownershipOffered) {

    /** A member with no offer outstanding — the shape every caller used before S1.6. */
    public static MemberResponse of(MemberSummary m) {
        return of(m, false);
    }

    public static MemberResponse of(MemberSummary m, boolean ownershipOffered) {
        return new MemberResponse(
                m.travelerId(),
                m.displayName(),
                m.role().name().toLowerCase(java.util.Locale.ROOT),
                m.joinedAt(),
                ownershipOffered);
    }
}
