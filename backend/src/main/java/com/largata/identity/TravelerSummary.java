package com.largata.identity;

import java.util.UUID;

/**
 * A traveler as other modules see them (S1.2): an id and a display name, nothing more.
 *
 * <p>The public projection the invitation surface composes with — member lists and the inviter's name
 * on an inbox card. Email is deliberately absent: it is a snapshot the identity module owns, and no
 * consumer here needs it. The entity stays package-private (ADR-002); this crosses the boundary.
 */
public record TravelerSummary(UUID id, String displayName) {}
