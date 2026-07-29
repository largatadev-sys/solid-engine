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
    }

    private OwnershipOffer(UUID id, UUID workspaceId, UUID targetTravelerId, UUID offeredBy, Instant offeredAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.targetTravelerId = targetTravelerId;
        this.status = OwnershipOfferStatus.PENDING;
        this.offeredBy = offeredBy;
        this.offeredAt = offeredAt;
    }


    static OwnershipOffer open(UUID workspaceId, UUID targetTravelerId, UUID offeredBy, Instant now) {
        if (workspaceId == null || targetTravelerId == null || offeredBy == null || now == null) {
            throw new IllegalArgumentException("An ownership offer names a workspace, a target, an owner and an instant");
        }
        if (targetTravelerId.equals(offeredBy)) {
            throw new IllegalArgumentException("An ownership offer cannot target the offering owner");
        }
        return new OwnershipOffer(UuidV7.generate(), workspaceId, targetTravelerId, offeredBy, now);
    }


    void accept(Instant now) {
        this.status = OwnershipOfferStatus.ACCEPTED;
        this.resolvedAt = now;
    }


    void decline(Instant now) {
        this.status = OwnershipOfferStatus.DECLINED;
        this.resolvedAt = now;
    }


    void revoke(Instant now) {
        this.status = OwnershipOfferStatus.REVOKED;
        this.resolvedAt = now;
    }



    void voidBySystem(Instant now) {
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
