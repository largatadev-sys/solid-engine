package com.largata.join;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "join_link")
public class JoinLink {

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(nullable = false, updatable = false)
    private String token;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected JoinLink() {
    }

    private JoinLink(UUID id, UUID workspaceId, String token, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.token = token;
        this.createdAt = createdAt;
    }


    static JoinLink mint(UUID workspaceId, String token, Instant now) {
        if (workspaceId == null || token == null || now == null) {
            throw new IllegalArgumentException("A join link names a workspace, a token and an instant");
        }
        return new JoinLink(UuidV7.generate(), workspaceId, token, now);
    }


    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    String token() {
        return token;
    }

    Instant createdAt() {
        return createdAt;
    }
}
