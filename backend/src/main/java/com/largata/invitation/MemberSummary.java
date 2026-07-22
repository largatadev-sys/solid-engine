package com.largata.invitation;

import com.largata.common.authz.Role;
import java.time.Instant;
import java.util.UUID;

/**
 * A workspace member as the member list shows them (S1.2): the workspace's {@code MembershipView}
 * (traveler id, role, joined-at) composed with the display name from the identity module. The first
 * screen in the product where a workspace's people are named.
 */
public record MemberSummary(UUID travelerId, String displayName, Role role, Instant joinedAt) {}
