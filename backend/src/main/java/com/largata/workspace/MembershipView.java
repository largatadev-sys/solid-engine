package com.largata.workspace;

import com.largata.common.authz.Role;
import java.time.Instant;
import java.util.UUID;

/**
 * A member of a workspace, as seen from outside the module (S1.2).
 *
 * <p>The public projection of a {@link Membership} row — the entity stays package-private (ADR-002),
 * so this is what {@link WorkspaceService#membersOf} hands back for the member list. It carries the
 * traveler id, not a name: names live in the identity module, and composing them is the caller's job
 * (the invitation module's web layer), keeping this module free of an identity dependency it does not
 * need.
 *
 * @param travelerId who the member is
 * @param role their standing (INV-4: exactly one {@code OWNER})
 * @param joinedAt when they joined — the itinerary's instant for the owner, the accept instant for a
 *     member (S1.2)
 */
public record MembershipView(UUID travelerId, Role role, Instant joinedAt) {}
