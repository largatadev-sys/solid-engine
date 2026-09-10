package com.largata.join.join.entity;

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
@Table(name = "join_request")
public class JoinRequest {

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "traveler_id", nullable = false, updatable = false)
    private UUID travelerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JoinRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decided_by")
    private UUID decidedBy;

    protected JoinRequest() {
    }

    private JoinRequest(UUID id, UUID workspaceId, UUID travelerId, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.travelerId = travelerId;
        this.status = JoinRequestStatus.PENDING;
        this.createdAt = createdAt;
    }


    public static JoinRequest open(UUID workspaceId, UUID travelerId, Instant now) {
        if (workspaceId == null || travelerId == null || now == null) {
            throw new IllegalArgumentException("A join request names a workspace, a traveler and an instant");
        }
        return new JoinRequest(UuidV7.generate(), workspaceId, travelerId, now);
    }


    public void approve(UUID byTravelerId, Instant now) {
        this.status = JoinRequestStatus.APPROVED;
        this.decidedBy = byTravelerId;
        this.decidedAt = now;
    }


    public void decline(UUID byTravelerId, Instant now) {
        this.status = JoinRequestStatus.DECLINED;
        this.decidedBy = byTravelerId;
        this.decidedAt = now;
    }


    public void supersede(Instant now) {
        this.status = JoinRequestStatus.SUPERSEDED;
        this.decidedAt = now;
    }


    public void withdraw(Instant now) {
        this.status = JoinRequestStatus.WITHDRAWN;
        this.decidedBy = travelerId;
        this.decidedAt = now;
    }


    public UUID id() {
        return id;
    }

    public UUID workspaceId() {
        return workspaceId;
    }

    public UUID travelerId() {
        return travelerId;
    }

    public JoinRequestStatus status() {
        return status;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
