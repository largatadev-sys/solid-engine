package com.largata.invitation.web;

import com.largata.invitation.InboxInvitation;
import java.time.Instant;
import java.util.UUID;

/**
 * An inbox invitation on the wire (S1.2) — the invitee's view: which trip, who invited them, and the
 * itinerary id to open on accept.
 */
public record InboxInvitationResponse(
        UUID id, UUID itineraryId, String tripTitle, String inviterName, Instant createdAt, Instant expiresAt) {

    public static InboxInvitationResponse of(InboxInvitation i) {
        return new InboxInvitationResponse(
                i.id(), i.itineraryId(), i.tripTitle(), i.inviterName(), i.createdAt(), i.expiresAt());
    }
}
