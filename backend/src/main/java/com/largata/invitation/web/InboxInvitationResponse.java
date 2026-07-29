package com.largata.invitation.web;

import com.largata.invitation.InboxInvitation;
import java.time.Instant;
import java.util.UUID;


public record InboxInvitationResponse(
        UUID id, UUID itineraryId, String tripTitle, String inviterName, Instant createdAt, Instant expiresAt) {

    public static InboxInvitationResponse of(InboxInvitation i) {
        return new InboxInvitationResponse(
                i.id(), i.itineraryId(), i.tripTitle(), i.inviterName(), i.createdAt(), i.expiresAt());
    }
}
