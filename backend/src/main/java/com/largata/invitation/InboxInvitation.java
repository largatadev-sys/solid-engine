package com.largata.invitation;

import java.time.Instant;
import java.util.UUID;


public record InboxInvitation(
        UUID id, UUID itineraryId, String tripTitle, String inviterName, Instant createdAt, Instant expiresAt) {}
