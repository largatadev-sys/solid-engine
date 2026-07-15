package com.largata.identity;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The domain's account (02-domain-model): the sole platform actor in v1, and what every future
 * foreign key points at.
 *
 * <p>Keyed to a Firebase identity by {@code firebaseUid} — the provider owns credentials, we own
 * identity (ADR-006). That indirection is the designed exit if Firebase is ever replaced.
 *
 * <p>{@code email} and {@code displayName} are a <strong>snapshot</strong> of the token's claims at
 * provisioning time, not a synced mirror (spec, decision 6d): a later change in Firebase does not
 * reach this row. Revisited at S1.2, where invites match by email.
 */
@Entity
@Table(name = "traveler")
public class Traveler {

    @Id private UUID id;

    @Column(name = "firebase_uid", nullable = false, unique = true, updatable = false)
    private String firebaseUid;

    @Column(nullable = false)
    private String email;

    /**
     * A human label — deliberately non-unique, and never a lookup key (02-domain-model). Two
     * travelers named "Ana Silva" are two travelers named Ana Silva; disambiguation is the UI's job
     * where it matters. If addressability is ever needed, that is a new concept (a handle), not a
     * constraint bolted onto this field.
     */
    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Traveler() {
        // JPA.
    }

    private Traveler(UUID id, String firebaseUid, String email, String displayName, Instant createdAt) {
        this.id = id;
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.displayName = displayName;
        this.createdAt = createdAt;
    }

    /**
     * Mints a Traveler for a verified Firebase identity. The id is generated here, app-side (S0.1
     * spec: UUIDv7, never DB-side), so it exists before persistence.
     */
    static Traveler provision(String firebaseUid, String email, String displayName, Instant createdAt) {
        return new Traveler(UuidV7.generate(), firebaseUid, email, displayName, createdAt);
    }

    public UUID id() {
        return id;
    }

    public String firebaseUid() {
        return firebaseUid;
    }

    public String email() {
        return email;
    }

    public String displayName() {
        return displayName;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
