package com.largata.invitation.web;

import com.largata.invitation.PendingInvitation;
import java.time.Instant;
import java.util.UUID;

/**
 * A pending invitation on the wire (S1.2) — the owner's view: which address, when sent, when it
 * expires. Serves both the create response (201) and the pending-list items; both are pending by
 * construction, so no status field is needed. The service composes the {@link PendingInvitation};
 * this is the transport shape, so the entity never leaves the module.
 */
public record InvitationResponse(UUID id, String email, Instant createdAt, Instant expiresAt) {

    public static InvitationResponse of(PendingInvitation pending) {
        return new InvitationResponse(pending.id(), pending.email(), pending.createdAt(), pending.expiresAt());
    }
}
