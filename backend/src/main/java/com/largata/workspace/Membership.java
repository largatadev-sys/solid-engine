package com.largata.workspace;

import com.largata.common.authz.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A Traveler's role in one Workspace (02-domain-model), as a stored row.
 *
 * <p><strong>Not to be confused with {@link com.largata.common.authz.Membership}, and the confusion
 * is worth one paragraph because the two share a name deliberately.</strong> That one is a
 * <em>capability</em> — an unforgeable-by-convention proof the guard mints and every private-content
 * service method demands as a parameter (ADR-003). This one is the <em>fact</em> that proof is read
 * from: a row this module owns, with a lifecycle (S1.2 writes them at invite acceptance, S1.5
 * deletes them, S1.6 moves the owner role between them). The domain calls both "membership" because
 * they are the same concept seen from two sides, and each name is right in its own context. Nothing
 * ever imports both: this class is package-private, and the resolver is the one place that turns a
 * row into a capability.
 *
 * <p>The composite key is {@code (workspace, travelerId)} — the pair is the row's identity (V4), so
 * there is no surrogate id to add a second way of naming the same thing.
 */
@Entity
@Table(name = "membership")
@IdClass(MembershipId.class)
class Membership {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false, updatable = false)
    private Workspace workspace;

    @Id
    @Column(name = "traveler_id", nullable = false, updatable = false)
    private UUID travelerId;

    /**
     * {@code EnumType.STRING}, never {@code ORDINAL}, for the reason {@code Itinerary} records — and
     * with one extra consequence here: this writes the enum's <em>name</em> ({@code OWNER}), which
     * is the value V4's partial unique index tests to enforce INV-4. Change how this column is
     * spelled and that index silently stops matching anything. {@code MembershipStorageIT} pins it.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    protected Membership() {
        // JPA.
    }

    Membership(Workspace workspace, UUID travelerId, Role role, Instant joinedAt) {
        this.workspace = workspace;
        this.travelerId = travelerId;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    UUID travelerId() {
        return travelerId;
    }

    Role role() {
        return role;
    }

    Instant joinedAt() {
        return joinedAt;
    }
}
