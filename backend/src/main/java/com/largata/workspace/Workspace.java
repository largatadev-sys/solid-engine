package com.largata.workspace;

import com.largata.common.authz.Role;
import com.largata.common.id.UuidV7;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "workspace")
public class Workspace {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false, unique = true)
    private UUID itineraryId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false)
    private WorkspaceState state;


    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Membership> memberships = new ArrayList<>();

    protected Workspace() {
    }

    private Workspace(UUID id, UUID itineraryId, Instant createdAt) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.createdAt = createdAt;
        this.state = WorkspaceState.ACTIVE;
    }


    static Workspace formAround(UUID itineraryId, UUID ownerTravelerId, Instant formedAt) {
        if (itineraryId == null || ownerTravelerId == null || formedAt == null) {
            throw new IllegalArgumentException("A workspace forms around an itinerary, for an owner, at an instant");
        }
        Workspace workspace = new Workspace(UuidV7.generate(), itineraryId, formedAt);
        workspace.memberships.add(new Membership(workspace, ownerTravelerId, Role.OWNER, formedAt));
        return workspace;
    }


    void markCompleted() {
        if (state == WorkspaceState.ARCHIVED) {
            return;
        }
        this.state = WorkspaceState.COMPLETED;
    }


    void markActive() {
        if (state == WorkspaceState.ARCHIVED) {
            return;
        }
        this.state = WorkspaceState.ACTIVE;
    }


    void archive() {
        if (state == WorkspaceState.ARCHIVED) {
            throw new IllegalStateException("Workspace " + id + " is already archived");
        }
        this.state = WorkspaceState.ARCHIVED;
    }


    void unarchive(boolean itineraryIsCompleted) {
        if (state != WorkspaceState.ARCHIVED) {
            throw new IllegalStateException("Workspace " + id + " is not archived");
        }
        this.state = itineraryIsCompleted ? WorkspaceState.COMPLETED : WorkspaceState.ACTIVE;
    }

    public UUID id() {
        return id;
    }

    public UUID itineraryId() {
        return itineraryId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public WorkspaceState state() {
        return state;
    }
}
