package com.largata.itinerary;

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
@Table(name = "edit_lease")
class EditLease {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type", nullable = false, updatable = false)
    private LeaseSubjectType subjectType;

    @Column(name = "subject_id", nullable = false, updatable = false)
    private UUID subjectId;

    @Column(name = "holder_id", nullable = false)
    private UUID holderId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "acquired_at", nullable = false)
    private Instant acquiredAt;

    protected EditLease() {
    }

    private EditLease(
            UUID id,
            UUID itineraryId,
            LeaseSubject subject,
            UUID holderId,
            Instant acquiredAt,
            Instant expiresAt) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.subjectType = subject.type();
        this.subjectId = subject.id();
        this.holderId = holderId;
        this.acquiredAt = acquiredAt;
        this.expiresAt = expiresAt;
    }


    static EditLease heldBy(
            UUID itineraryId, LeaseSubject subject, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        if (itineraryId == null || subject == null || holderId == null || acquiredAt == null || expiresAt == null) {
            throw new IllegalArgumentException("A lease names an itinerary, a subject, a holder, and its window");
        }
        return new EditLease(UuidV7.generate(), itineraryId, subject, holderId, acquiredAt, expiresAt);
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

    LeaseSubject subject() {
        return new LeaseSubject(subjectType, subjectId);
    }

    UUID holderId() {
        return holderId;
    }

    Instant expiresAt() {
        return expiresAt;
    }
}
