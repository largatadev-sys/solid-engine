package com.largata.membership;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The owner's pending proposal to hand a workspace's ownership to one of its members (02-domain-model,
 * S1.6) — as a stored row.
 *
 * <p><strong>Why ownership moves by offer rather than by decree.</strong> The S1.6 grilling first
 * locked a unilateral transfer and the founder reversed it; the reasoning is canon now. Under this
 * product's no-notifications posture both designs have an unnoticed case, and they are not symmetric:
 * an unnoticed offer leaves a present, capable owner in place — a delay. An unnoticed *imposed*
 * ownership moves INV-4's load-bearing role to somebody who does not know they hold it, which is the
 * dormant-owner problem the E5 claim flow exists to fix, manufactured by the very feature meant to
 * prevent it. Acceptance is the mechanism that guarantees the new owner knows.
 *
 * <p><strong>This module's first table</strong> (S1.5 created {@code com.largata.membership} with
 * none — see {@link MembershipService} for why the module exists at all). The offer belongs to the
 * Workspace aggregate by design, the way Invitation does: own table, own service interface, reached by
 * nobody else's SQL (ADR-002).
 *
 * <p><strong>Shaped after {@link com.largata.invitation.Invitation}</strong>, which solved this exact
 * problem at S1.2 — a pending proposal with terminal ends, one live at a time, no bearer token. The
 * differences are deliberate: the target is a traveler id rather than an email (an offer never admits
 * anyone — it re-ranks a member who is already inside the walls, so there is nobody to identify by
 * address), and there is no expiry. An offer sits until acted on; a TTL would be a scheduler and a
 * status value with no reader, and {@code EXPIRED} can join this enum additively the day usage asks.
 */
@Entity
@Table(name = "ownership_offer")
public class OwnershipOffer {

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "target_traveler_id", nullable = false, updatable = false)
    private UUID targetTravelerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OwnershipOfferStatus status;

    @Column(name = "offered_by", nullable = false, updatable = false)
    private UUID offeredBy;

    @Column(name = "offered_at", nullable = false, updatable = false)
    private Instant offeredAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected OwnershipOffer() {
        // JPA.
    }

    private OwnershipOffer(UUID id, UUID workspaceId, UUID targetTravelerId, UUID offeredBy, Instant offeredAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.targetTravelerId = targetTravelerId;
        this.status = OwnershipOfferStatus.PENDING;
        this.offeredBy = offeredBy;
        this.offeredAt = offeredAt;
    }

    /**
     * Opens a pending offer. The caller owns the domain checks that precede it (the target is a member,
     * is not the owner themselves, and no offer is already pending) — this constructor guards only the
     * shape of the row.
     */
    static OwnershipOffer open(UUID workspaceId, UUID targetTravelerId, UUID offeredBy, Instant now) {
        if (workspaceId == null || targetTravelerId == null || offeredBy == null || now == null) {
            throw new IllegalArgumentException("An ownership offer names a workspace, a target, an owner and an instant");
        }
        if (targetTravelerId.equals(offeredBy)) {
            // Restated here as well as in the service: an offer to oneself is not a row this table
            // should ever be able to hold, whatever a future caller believes.
            throw new IllegalArgumentException("An ownership offer cannot target the offering owner");
        }
        return new OwnershipOffer(UuidV7.generate(), workspaceId, targetTravelerId, offeredBy, now);
    }

    /** The target took the crown; the transfer executes in the same transaction (S1.6 §6). */
    void accept(Instant now) {
        this.status = OwnershipOfferStatus.ACCEPTED;
        this.resolvedAt = now;
    }

    /** The target refused. */
    void decline(Instant now) {
        this.status = OwnershipOfferStatus.DECLINED;
        this.resolvedAt = now;
    }

    /** The owner retracted it. */
    void revoke(Instant now) {
        this.status = OwnershipOfferStatus.REVOKED;
        this.resolvedAt = now;
    }

    /**
     * The target left the trip while this stood (S1.6 §5) — the system's act, not a person's, which is
     * why it is not {@link #revoke}. Called inside S1.5's departure transaction, so an offer never
     * outlives the membership it points at.
     */
    void voidBecauseTargetDeparted(Instant now) {
        this.status = OwnershipOfferStatus.VOIDED;
        this.resolvedAt = now;
    }

    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    UUID targetTravelerId() {
        return targetTravelerId;
    }

    OwnershipOfferStatus status() {
        return status;
    }

    UUID offeredBy() {
        return offeredBy;
    }

    Instant offeredAt() {
        return offeredAt;
    }
}
