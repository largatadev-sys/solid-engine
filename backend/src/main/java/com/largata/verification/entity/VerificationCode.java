package com.largata.verification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "verification_code")
public class VerificationCode {

    @Id
    @Column(name = "traveler_id", updatable = false)
    private UUID travelerId;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    protected VerificationCode() {
    }

    private VerificationCode(UUID travelerId, String codeHash, Instant issuedAt, Instant expiresAt) {
        this.travelerId = travelerId;
        this.codeHash = codeHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.attempts = 0;
    }


    public static VerificationCode issue(UUID travelerId, String codeHash, Instant issuedAt, Instant expiresAt) {
        return new VerificationCode(travelerId, codeHash, issuedAt, expiresAt);
    }


    public void recordFailedAttempt() {
        this.attempts++;
    }


    public void reissue(String codeHash, Instant issuedAt, Instant expiresAt) {
        this.codeHash = codeHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.attempts = 0;
    }

    public UUID travelerId() {
        return travelerId;
    }

    public String codeHash() {
        return codeHash;
    }

    public Instant issuedAt() {
        return issuedAt;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public int attempts() {
        return attempts;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }
}
