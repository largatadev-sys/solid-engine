package com.largata.itinerary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "edit_lease")
class EditLease {

    @Id
    @Column(name = "itinerary_id", updatable = false)
    private UUID itineraryId;

    @Column(name = "holder_id", nullable = false)
    private UUID holderId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "acquired_at", nullable = false)
    private Instant acquiredAt;

    protected EditLease() {
    }

    private EditLease(UUID itineraryId, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        this.itineraryId = itineraryId;
        this.holderId = holderId;
        this.acquiredAt = acquiredAt;
        this.expiresAt = expiresAt;
    }


    static EditLease heldBy(UUID itineraryId, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        if (itineraryId == null || holderId == null || acquiredAt == null || expiresAt == null) {
            throw new IllegalArgumentException("A lease names an itinerary, a holder, and its window");
        }
        return new EditLease(itineraryId, holderId, acquiredAt, expiresAt);
    }


    void takeOver(UUID newHolderId, Instant acquiredAt, Instant expiresAt) {
        this.holderId = newHolderId;
        this.acquiredAt = acquiredAt;
        this.expiresAt = expiresAt;
    }


    void renewUntil(Instant newExpiresAt) {
        this.expiresAt = newExpiresAt;
    }


    boolean isLiveAt(Instant now) {
        return expiresAt.isAfter(now);
    }

    boolean isHeldBy(UUID travelerId) {
        return holderId.equals(travelerId);
    }

    UUID itineraryId() {
        return itineraryId;
    }

    UUID holderId() {
        return holderId;
    }

    Instant expiresAt() {
        return expiresAt;
    }
}
