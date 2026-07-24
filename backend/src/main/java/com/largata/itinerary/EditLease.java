package com.largata.itinerary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The single-writer lock on one itinerary's plan editing (S1.4, ADR-014, 02-domain-model).
 *
 * <p><strong>A concurrency control, not domain history.</strong> A lease says "someone is editing
 * this plan right now, until {@code expiresAt}", and nothing more — it carries no audit meaning, and
 * an expired one is indistinguishable from no lock at all. That is why {@link #isLiveAt} is the only
 * question worth asking of it: a row exists, but whether it <em>locks</em> depends entirely on the
 * clock (ADR-014 — expiry is the real guarantee, since a client that dies mid-edit never releases).
 *
 * <p><strong>Keyed by the itinerary, one row apiece.</strong> The 1:1 with Itinerary is the identity
 * of a lease — "the lock on trip X" — so the itinerary id <em>is</em> the primary key (V8), not a
 * surrogate. Acquiring overwrites the row in place; there is never more than one lease per itinerary,
 * locked or lapsed.
 *
 * <p>Package-private, like {@link Day}: everything outside the itinerary module reaches the lock
 * through {@link EditLeaseService} (ADR-002). The holder is a traveler id, always a member of this
 * itinerary's workspace — acquisition runs behind the guard, so a non-member can never hold one.
 */
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
        // JPA.
    }

    private EditLease(UUID itineraryId, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        this.itineraryId = itineraryId;
        this.holderId = holderId;
        this.acquiredAt = acquiredAt;
        this.expiresAt = expiresAt;
    }

    /** Mints a lease held by a traveler, live from {@code acquiredAt} until {@code acquiredAt + ttl}. */
    static EditLease heldBy(UUID itineraryId, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        if (itineraryId == null || holderId == null || acquiredAt == null || expiresAt == null) {
            throw new IllegalArgumentException("A lease names an itinerary, a holder, and its window");
        }
        return new EditLease(itineraryId, holderId, acquiredAt, expiresAt);
    }

    /**
     * The same lease, taken over by a (possibly different) holder from a fresh instant — the object
     * mutation behind an acquire over an expired row, or the first acquire after this one lapsed.
     */
    void takeOver(UUID newHolderId, Instant acquiredAt, Instant expiresAt) {
        this.holderId = newHolderId;
        this.acquiredAt = acquiredAt;
        this.expiresAt = expiresAt;
    }

    /** Pushes expiry forward — renewal while the holder's edit screen stays open. */
    void renewUntil(Instant newExpiresAt) {
        this.expiresAt = newExpiresAt;
    }

    /**
     * Whether this lease actually locks at {@code now}. An expired row does not — it is treated as no
     * lock (ADR-014), which is what lets an abandoned lease free itself with no cleanup job.
     */
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
