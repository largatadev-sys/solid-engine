package com.largata.workspace;

import com.largata.common.authz.Role;
import com.largata.common.id.UuidV7;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The Trip Workspace (02-domain-model): the private collaboration space around one Itinerary, and
 * — the part that matters most — <strong>the access-control boundary the whole product is walled
 * by</strong> (Artifact 03: one world, walled rooms).
 *
 * <p>S1.1 builds the shell and its Memberships. Invitations, Decisions, private Comments and the
 * Ledger are all part of this aggregate by design (Artifact 02) but arrive with their own stories,
 * additively.
 *
 * <p><strong>{@code itineraryId} is a UUID, not an {@code Itinerary}.</strong> Modules reference
 * each other by ID and service interface only (ADR-002) — and here the discipline is load-bearing
 * rather than stylistic: this module must answer the guard's question without reaching into the
 * itinerary module, or {@code common → workspace → itinerary → workspace} closes into exactly the
 * cycle ADR-011 was written to prevent.
 *
 * <p><strong>No {@code state} field</strong> — see V4's note. The workspace state machine is
 * Artifact 02's, but register #12 (does {@code forming} exist?) belongs to the invite story, and
 * nothing in S1.1 reads state.
 */
@Entity
@Table(name = "workspace")
public class Workspace {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false, unique = true)
    private UUID itineraryId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * The memberships, mapped as a cascade from the root so that forming a workspace is one
     * {@code save} of one aggregate rather than two coordinated writes — INV-4's "no ownerless
     * window" is then a property of the object graph, not of the caller remembering both halves.
     *
     * <p>{@code LAZY} because the guard never loads this collection: it asks a projection query for
     * one role (see {@code MembershipRepository}). Loading an aggregate to answer a boolean is the
     * shape S0.3's resolver already refused.
     */
    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Membership> memberships = new ArrayList<>();

    protected Workspace() {
        // JPA.
    }

    private Workspace(UUID id, UUID itineraryId, Instant createdAt) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.createdAt = createdAt;
    }

    /**
     * Forms a workspace around an itinerary, with its creator installed as {@code OWNER} in the same
     * object — <strong>there is no way to make one without an owner</strong>, which is INV-4's "no
     * ownerless window ever exists" (Artifact 03) expressed as a factory rather than as a rule
     * someone has to follow.
     *
     * @param formedAt the <em>itinerary's</em> creation instant, not {@code now()} — the workspace
     *     exists from the itinerary's first instant, and the backfill (V5) writes that same truth
     *     for itineraries that predate the table. A workspace stamped later than its own trip is a
     *     small lie that every future query would have to know about.
     */
    static Workspace formAround(UUID itineraryId, UUID ownerTravelerId, Instant formedAt) {
        if (itineraryId == null || ownerTravelerId == null || formedAt == null) {
            throw new IllegalArgumentException("A workspace forms around an itinerary, for an owner, at an instant");
        }
        Workspace workspace = new Workspace(UuidV7.generate(), itineraryId, formedAt);
        workspace.memberships.add(new Membership(workspace, ownerTravelerId, Role.OWNER, formedAt));
        return workspace;
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

    /** Defensively copied: the aggregate's own list is not a handle for callers to mutate. */
    public List<Membership> memberships() {
        return List.copyOf(memberships);
    }
}
