package com.largata.identity;

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
@Table(name = "follow_request")
public class FollowRequest {

    @Id private UUID id;

    @Column(name = "requester_id", nullable = false, updatable = false)
    private UUID requesterId;

    @Column(name = "target_id", nullable = false, updatable = false)
    private UUID targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FollowRequestStatus status;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    protected FollowRequest() {
    }

    private FollowRequest(UUID id, UUID requesterId, UUID targetId, Instant requestedAt) {
        this.id = id;
        this.requesterId = requesterId;
        this.targetId = targetId;
        this.status = FollowRequestStatus.PENDING;
        this.requestedAt = requestedAt;
    }


    static FollowRequest asked(UUID requesterId, UUID targetId, Instant at) {
        return new FollowRequest(UuidV7.generate(), requesterId, targetId, at);
    }


    void approve(Instant at) {
        decide(FollowRequestStatus.APPROVED, at);
    }


    void decline(Instant at) {
        decide(FollowRequestStatus.DECLINED, at);
    }


    void cancel(Instant at) {
        decide(FollowRequestStatus.CANCELLED, at);
    }


    private void decide(FollowRequestStatus outcome, Instant at) {
        this.status = outcome;
        this.decidedAt = at;
    }

    public UUID id() {
        return id;
    }

    public UUID requesterId() {
        return requesterId;
    }

    public UUID targetId() {
        return targetId;
    }

    public FollowRequestStatus status() {
        return status;
    }

    public Instant requestedAt() {
        return requestedAt;
    }

    public Instant decidedAt() {
        return decidedAt;
    }
}
