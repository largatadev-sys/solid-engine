package com.largata.invitation;

import java.time.Instant;
import java.util.UUID;


public record PendingInvitation(UUID id, String email, Instant createdAt, Instant expiresAt) {}
