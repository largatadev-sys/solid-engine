package com.largata.workspace;

import com.largata.common.authz.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "membership")
@IdClass(MembershipId.class)
class Membership {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false, updatable = false)
    private Workspace workspace;

    @Id
    @Column(name = "traveler_id", nullable = false, updatable = false)
    private UUID travelerId;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    protected Membership() {
    }

    Membership(Workspace workspace, UUID travelerId, Role role, Instant joinedAt) {
        this.workspace = workspace;
        this.travelerId = travelerId;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    UUID travelerId() {
        return travelerId;
    }

    Role role() {
        return role;
    }

    Instant joinedAt() {
        return joinedAt;
    }
}
