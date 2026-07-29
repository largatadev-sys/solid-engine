package com.largata.invitation.web;

import com.largata.invitation.PendingInvitation;
import java.time.Instant;
import java.util.UUID;


public record InvitationResponse(UUID id, String email, Instant createdAt, Instant expiresAt) {

    public static InvitationResponse of(PendingInvitation pending) {
        return new InvitationResponse(pending.id(), pending.email(), pending.createdAt(), pending.expiresAt());
    }
}
