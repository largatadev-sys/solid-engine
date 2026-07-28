package com.largata.membership;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The durable record of ownership moving from one traveler to another (02-domain-model, S1.6) —
 * written when an {@link OwnershipOffer} is accepted, in the transfer's own transaction.
 *
 * <p><strong>This table has no reader in the product, and ships anyway.</strong> That is normally this
 * repo's cue to defer (S1.2's state column; S1.5's rejected {@code membership_event} log), so the
 * exception needs its reasoning attached. Two precedents point in opposite directions and the S1.3 one
 * wins: <em>"deferring attribution is the one deferral that destroys data retroactively."</em> A
 * transfer that happens unrecorded is unrecoverable — there is no backfill for who owned what when —
 * while the rejected event log recorded comings and goings nobody had asked to keep. This one is named
 * three times in canon as a record that must survive account deletion (01 §Compliance, 02's Traveler
 * entry, 03 §77).
 *
 * <p><strong>What it buys, concretely:</strong> the creator of any itinerary is derivable forever — the
 * earliest transfer's {@code fromTravelerId}, or the current owner if the trip has never been handed
 * on. That answers E4's "(Creator)" badge (register #5) and the backlog's influencer program without a
 * retrofit, which is exactly what could not be true if these rows did not exist.
 *
 * <p><strong>Anonymization-safe by construction:</strong> traveler ids and a timestamp, no names, no
 * emails. When S5.5 erases a traveler's PII these rows keep meaning what they meant, with nothing in
 * them to redact — which is why 01 can promise they "survive anonymized" without a scrubbing step.
 *
 * <p>No {@code kind} column until E5 adds the owner-deletion claim (S1.6 §1): a discriminator with one
 * value has no reader, and adding it later is additive.
 */
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
        // JPA.
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
