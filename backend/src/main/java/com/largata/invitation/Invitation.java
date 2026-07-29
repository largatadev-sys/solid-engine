package com.largata.invitation;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "invitation")
public class Invitation {


    public static final Duration VALIDITY = Duration.ofDays(14);

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(nullable = false, updatable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationStatus status;

    @Column(name = "invited_by", nullable = false, updatable = false)
    private UUID invitedBy;

    @Column(name = "accepted_by")
    private UUID acceptedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected Invitation() {
    }

    private Invitation(UUID id, UUID workspaceId, String email, UUID invitedBy, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.email = email;
        this.status = InvitationStatus.PENDING;
        this.invitedBy = invitedBy;
        this.createdAt = createdAt;
        this.expiresAt = createdAt.plus(VALIDITY);
    }


    static Invitation open(UUID workspaceId, String email, UUID invitedBy, Instant now) {
        if (workspaceId == null || email == null || email.isBlank() || invitedBy == null || now == null) {
            throw new IllegalArgumentException("An invitation names a workspace, an email, an inviter and an instant");
        }
        if (!email.equals(email.strip().toLowerCase())) {
            throw new IllegalArgumentException("An invitation's email must be normalised (trimmed, lowercased)");
        }
        return new Invitation(UuidV7.generate(), workspaceId, email, invitedBy, now);
    }


    boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    void accept(UUID acceptingTravelerId, Instant now) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedBy = acceptingTravelerId;
        this.resolvedAt = now;
    }

    void decline(Instant now) {
        this.status = InvitationStatus.DECLINED;
        this.resolvedAt = now;
    }

    void revoke(Instant now) {
        this.status = InvitationStatus.REVOKED;
        this.resolvedAt = now;
    }


    void voidBySystem(Instant now) {
        this.status = InvitationStatus.VOIDED;
        this.resolvedAt = now;
    }


    void expire(Instant now) {
        this.status = InvitationStatus.EXPIRED;
        this.resolvedAt = now;
    }

    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    String email() {
        return email;
    }

    InvitationStatus status() {
        return status;
    }

    UUID invitedBy() {
        return invitedBy;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant expiresAt() {
        return expiresAt;
    }
}
