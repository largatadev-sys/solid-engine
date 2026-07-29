package com.largata.membership;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "ownership_transfer")
public class OwnershipTransfer {

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "from_traveler_id", nullable = false, updatable = false)
    private UUID fromTravelerId;

    @Column(name = "to_traveler_id", nullable = false, updatable = false)
    private UUID toTravelerId;

    @Column(name = "transferred_at", nullable = false, updatable = false)
    private Instant transferredAt;

    protected OwnershipTransfer() {
    }

    private OwnershipTransfer(UUID id, UUID workspaceId, UUID fromTravelerId, UUID toTravelerId, Instant at) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.fromTravelerId = fromTravelerId;
        this.toTravelerId = toTravelerId;
        this.transferredAt = at;
    }

    static OwnershipTransfer record(UUID workspaceId, UUID fromTravelerId, UUID toTravelerId, Instant at) {
        if (workspaceId == null || fromTravelerId == null || toTravelerId == null || at == null) {
            throw new IllegalArgumentException("A transfer names a workspace, a giver, a taker and an instant");
        }
        if (fromTravelerId.equals(toTravelerId)) {
            throw new IllegalArgumentException("Ownership cannot transfer to its current holder");
        }
        return new OwnershipTransfer(UuidV7.generate(), workspaceId, fromTravelerId, toTravelerId, at);
    }

    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    UUID fromTravelerId() {
        return fromTravelerId;
    }

    UUID toTravelerId() {
        return toTravelerId;
    }

    Instant transferredAt() {
        return transferredAt;
    }
}
