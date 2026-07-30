package com.largata.verification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "verification_code")
class VerificationCode {

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


    static VerificationCode issue(UUID travelerId, String codeHash, Instant issuedAt, Instant expiresAt) {
        return new VerificationCode(travelerId, codeHash, issuedAt, expiresAt);
    }


    void recordFailedAttempt() {
        this.attempts++;
    }


    void reissue(String codeHash, Instant issuedAt, Instant expiresAt) {
        this.codeHash = codeHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.attempts = 0;
    }

    UUID travelerId() {
        return travelerId;
    }

    String codeHash() {
        return codeHash;
    }

    Instant issuedAt() {
        return issuedAt;
    }

    Instant expiresAt() {
        return expiresAt;
    }

    int attempts() {
        return attempts;
    }

    boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }
}
