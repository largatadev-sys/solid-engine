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
@Table(name = "activity_history")
class ActivityHistoryEntry {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;

    @Column(name = "actor_id", nullable = false, updatable = false)
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private HistoryAct act;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type", nullable = false, updatable = false)
    private LeaseSubjectType subjectType;

    @Column(name = "subject_id", nullable = false, updatable = false)
    private UUID subjectId;

    @Column(name = "at", nullable = false, updatable = false)
    private Instant at;

    protected ActivityHistoryEntry() {
    }

    private ActivityHistoryEntry(
            UUID id, UUID itineraryId, UUID actorId, HistoryAct act, LeaseSubject subject, Instant at) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.actorId = actorId;
        this.act = act;
        this.subjectType = subject.type();
        this.subjectId = subject.id();
        this.at = at;
    }


    static ActivityHistoryEntry of(UUID itineraryId, UUID actorId, HistoryAct act, LeaseSubject subject, Instant at) {
        if (itineraryId == null || actorId == null || act == null || subject == null || at == null) {
            throw new IllegalArgumentException("A history entry names a trip, an actor, an act, a subject and an instant");
        }
        return new ActivityHistoryEntry(UuidV7.generate(), itineraryId, actorId, act, subject, at);
    }

    UUID id() {
        return id;
    }

    UUID itineraryId() {
        return itineraryId;
    }

    UUID actorId() {
        return actorId;
    }

    HistoryAct act() {
        return act;
    }

    LeaseSubject subject() {
        return new LeaseSubject(subjectType, subjectId);
    }

    Instant at() {
        return at;
    }
}
