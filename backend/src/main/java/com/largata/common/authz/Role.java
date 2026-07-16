package com.largata.common.authz;

/**
 * A traveler's standing in one Trip Workspace (02-domain-model): exactly one {@code OWNER} exists at
 * all times (INV-4); everyone else who has accepted an invitation is a {@code MEMBER}.
 *
 * <p>Both values exist from S0.3 even though only {@code OWNER} can be produced until E1 — the
 * vocabulary is the domain's, and role-gated operations (remove member, publish, archive) check
 * against this enum on the object the guard already resolved, never inline against the database
 * (Artifact 03).
 */
public enum Role {
    OWNER,
    MEMBER
}
