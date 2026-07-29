package com.largata.identity;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "traveler")
public class Traveler {

    @Id private UUID id;

    @Column(name = "firebase_uid", nullable = false, unique = true, updatable = false)
    private String firebaseUid;

    @Column(nullable = false)
    private String email;


    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Traveler() {
    }

    private Traveler(UUID id, String firebaseUid, String email, String displayName, Instant createdAt) {
        this.id = id;
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.displayName = displayName;
        this.createdAt = createdAt;
    }


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
