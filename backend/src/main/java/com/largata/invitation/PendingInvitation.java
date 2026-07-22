package com.largata.invitation;

import java.time.Instant;
import java.util.UUID;

/**
 * A pending invitation as the owner sees it in the workspace's invite list (S1.2): the address it
 * went to and when, enough to recognise it and revoke it. No trip title or inviter name — the owner
 * is already inside the trip looking at its members.
 */
public record PendingInvitation(UUID id, String email, Instant createdAt, Instant expiresAt) {}
