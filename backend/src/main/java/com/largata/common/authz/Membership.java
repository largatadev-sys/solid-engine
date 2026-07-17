package com.largata.common.authz;

import java.util.UUID;

/**
 * Proof that a traveler may act on an itinerary, and in what role — the object Artifact 03's whole
 * enforcement model turns on.
 *
 * <p><strong>This type is a capability, not a data holder.</strong> Its value is not the three
 * fields; it is that a service method demanding one as a parameter <em>cannot be called</em> by a
 * handler that has not been through {@link AuthorizationGuard} — the guard is the only thing in the
 * production graph that produces one. A forgotten authorization check is therefore a compile error
 * rather than a silent leak (ADR-003).
 *
 * <p><strong>The honest limit of that claim.</strong> This is a record, so its constructor is
 * public: nothing stops determined code from forging a membership. That is not the threat model.
 * The guard defends against <em>forgetting</em> — the default-by-omission failure Artifact 03
 * rejected per-service checks over — and against forgetting, a required parameter of a type you
 * cannot obtain by accident is a complete defence. Code that fabricates one has decided to bypass
 * authorization, which no signature can prevent and which review catches on sight. (A sealed class
 * with a package-private constructor was tried and abandoned: the resolver seam means the *producer*
 * lives in whichever module owns the data — outside this package by construction — so the closed
 * constructor would have had to open anyway.)
 *
 * <p><strong>Why it lives in {@code common} and predates the Workspace</strong> (ADR-011): the guard
 * is a chokepoint every module consults — the same shape as ADR-009's entitlement service — so it
 * sits beneath the modules rather than beside them. Memberships become real rows at S1.1; until
 * then the S0.3 resolver synthesizes an {@code OWNER} membership from itinerary ownership. Nothing
 * above this type can tell the difference, which is the point of the seam.
 *
 * @param travelerId who was verified
 * @param itineraryId what they were verified against — the workspace's key until the Workspace
 *     itself exists (Workspace is 1:1 with Itinerary, 02-domain-model)
 * @param role their standing, for role-gated operations
 */
public record Membership(UUID travelerId, UUID itineraryId, Role role) {

    public Membership {
        if (travelerId == null || itineraryId == null || role == null) {
            throw new IllegalArgumentException("A membership names a traveler, an itinerary and a role");
        }
    }

    public boolean isOwner() {
        return role == Role.OWNER;
    }
}
