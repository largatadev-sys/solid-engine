package com.largata.invitation.web;

import com.largata.invitation.PendingInvitation;
import java.time.Instant;
import java.util.UUID;


public record InvitationResponse(
        UUID id,
        String email,
        UUID inviteeTravelerId,
        String inviteeHandle,
        String inviterHandle,
        boolean emailLegacy,
        Instant createdAt,
        Instant expiresAt) {

    public static InvitationResponse of(PendingInvitation pending) {
        return new InvitationResponse(
                pending.id(),
                pending.email(),
                pending.inviteeTravelerId(),
                pending.inviteeHandle(),
                pending.inviterHandle(),
                pending.isEmailLegacy(),
                pending.createdAt(),
                pending.expiresAt());
    }
}
