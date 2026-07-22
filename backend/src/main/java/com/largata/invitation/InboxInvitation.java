package com.largata.invitation;

import java.time.Instant;
import java.util.UUID;

/**
 * An invitation as the invitee sees it in their inbox (S1.2): which trip, who invited them, and the
 * itinerary id to open on accept. Composed across three modules — the invitation row (this module),
 * the trip title (itinerary), the inviter's name (identity) — in {@link InvitationService}, the
 * "assembled in the service layer via service interfaces by ID" the spec calls ADR-002's first real
 * exercise.
 */
public record InboxInvitation(
        UUID id, UUID itineraryId, String tripTitle, String inviterName, Instant createdAt, Instant expiresAt) {}
