package com.largata.invitation;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * An email invite into a Trip Workspace (02-domain-model), as a stored row — the co-traveler
 * onboarding path (S1.2).
 *
 * <p><strong>Why this is its own module and not inside {@code workspace}.</strong> The Invitation is
 * part of the Workspace aggregate by design (Artifact 02), the way the Ledger is — "own tables, own
 * service interface" — and it lives in {@code com.largata.invitation} for a hard reason, not a
 * stylistic one. Composing the inbox and member views needs itinerary titles and traveler names, so
 * this module depends on {@code itinerary} and {@code identity}; and {@code itinerary} already depends
 * on {@code workspace} (S1.1 formation). Putting invitations in {@code workspace} would force {@code
 * workspace → itinerary} and close the exact {@code itinerary ⇄ workspace} cycle ADR-002 and ADR-011
 * exist to prevent. As its own module this one depends on the three below it and nothing depends back
 * — acyclic (S1.2 spec §API, the ADR-002 note).
 *
 * <p><strong>No token field</strong> (grilling Q6): authority to accept is the verified-email match,
 * not a bearer secret, so there is nothing here to hash, burn, or leak. {@code email} is stored
 * lowercased (normalised once before persistence) so the partial index and the accept-time match both
 * work on one canonical form.
 */
@Entity
@Table(name = "invitation")
public class Invitation {

    /** The invitation window (grilling Q4): a constant in one place, never a wire contract. */
    public static final Duration VALIDITY = Duration.ofDays(14);

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(nullable = false, updatable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationStatus status;

    @Column(name = "invited_by", nullable = false, updatable = false)
    private UUID invitedBy;

    @Column(name = "accepted_by")
    private UUID acceptedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected Invitation() {
        // JPA.
    }

    private Invitation(UUID id, UUID workspaceId, String email, UUID invitedBy, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.email = email;
        this.status = InvitationStatus.PENDING;
        this.invitedBy = invitedBy;
        this.createdAt = createdAt;
        this.expiresAt = createdAt.plus(VALIDITY);
    }

    /**
     * Opens a pending invitation. The email must arrive already normalised (lowercased, trimmed) —
     * the caller owns that so the one canonical form is established before this row exists and before
     * the partial unique index or any match sees it.
     *
     * @param email the invited address, already trimmed and lowercased
     */
    static Invitation open(UUID workspaceId, String email, UUID invitedBy, Instant now) {
        if (workspaceId == null || email == null || email.isBlank() || invitedBy == null || now == null) {
            throw new IllegalArgumentException("An invitation names a workspace, an email, an inviter and an instant");
        }
        if (!email.equals(email.strip().toLowerCase())) {
            // The domain restates the DB CHECK: a mixed-case email here would be a row the index and
            // the accept-match silently disagree about. Normalise before calling; do not pass raw.
            throw new IllegalArgumentException("An invitation's email must be normalised (trimmed, lowercased)");
        }
        return new Invitation(UuidV7.generate(), workspaceId, email, invitedBy, now);
    }

    /** True once {@code expires_at} has passed — the lazy expiry check (grilling Q4). */
    boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    void accept(UUID acceptingTravelerId, Instant now) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedBy = acceptingTravelerId;
        this.resolvedAt = now;
    }

    void decline(Instant now) {
        this.status = InvitationStatus.DECLINED;
        this.resolvedAt = now;
    }

    void revoke(Instant now) {
        this.status = InvitationStatus.REVOKED;
        this.resolvedAt = now;
    }

    /**
     * Realises lazy expiry (grilling Q4): flips a past-its-window PENDING row to {@code EXPIRED}. Done
     * only where it must be — on re-invite, to free the one-pending slot the unique index guards.
     */
    void expire(Instant now) {
        this.status = InvitationStatus.EXPIRED;
        this.resolvedAt = now;
    }

    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    String email() {
        return email;
    }

    InvitationStatus status() {
        return status;
    }

    UUID invitedBy() {
        return invitedBy;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant expiresAt() {
        return expiresAt;
    }
}
