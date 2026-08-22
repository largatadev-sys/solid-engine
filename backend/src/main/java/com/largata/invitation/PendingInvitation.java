package com.largata.invitation;

import java.time.Instant;
import java.util.UUID;


public record PendingInvitation(
        UUID id,
        String email,
        UUID inviteeTravelerId,
        String inviteeHandle,
        String inviterHandle,
        Instant createdAt,
        Instant expiresAt) {


    public boolean isEmailLegacy() {
        return inviteeTravelerId == null;
    }
}
