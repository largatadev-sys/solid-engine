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
 * <p><strong>The {@code state} field arrived at S1.9</strong>, after deferring from S1.1 (V4's note),
 * S1.2 (register #12) and S1.7 — each time on the same discipline: the column ships with the first
 * story that <em>reads</em> a state value, and until {@code ARCHIVED} existed the state was fully
 * derivable from the itinerary (1:1). S1.9's write fence and trip-list filter are those readers.
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
     * Where the trip sits in the workspace machine (S1.9).
     *
     * <p>{@code @Enumerated(STRING)} — the name, {@code ACTIVE}, is what reaches the column, and V13
     * records that as a contract any SQL naming these values is bound by (the V3/S1.1 lesson: a
     * lower-case spelling in a predicate matches nothing, creates cleanly, and enforces nothing).
     * Ordinal storage is never used here: it would make the enum's declaration order a schema fact.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false)
    private WorkspaceState state;

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
        // ACTIVE explicitly, never a column default — V13 ships without one on purpose (its note
        // records why: V3's dead `DEFAULT 'draft'` was a spelling trap that nearly cost an index).
        // Register #12 resolved this value at S1.2: a workspace is active from creation, because
        // formation is atomic with the itinerary and no behaviour anywhere branches on `forming`.
        this.state = WorkspaceState.ACTIVE;
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

    /**
     * Mirrors the itinerary completing (S1.9 ticket 01; canon's {@code active → completed} edge).
     *
     * <p><strong>Idempotent, and not a state machine guard.</strong> The legality of completing lives
     * on the <em>itinerary</em> aggregate, which refuses a second completion with a 409 before this is
     * ever reached — so re-asserting it here would be a second copy of one rule, drifting the day
     * either moves. What this method owns is the narrower question of what the mirror does when the
     * workspace is {@code ARCHIVED}: it holds the freeze. An archived workspace cannot be completed
     * through here because the fence refuses the itinerary transition upstream; if that ever changes,
     * the guard below is what stops archive from being silently overwritten by a mirror.
     */
    void markCompleted() {
        if (state == WorkspaceState.ARCHIVED) {
            return;
        }
        this.state = WorkspaceState.COMPLETED;
    }

    /**
     * The owner takes the trip out of circulation (S1.9): {@code active | completed → archived}.
     *
     * <p><strong>Legal from any live state</strong>, which amends canon's original "skipping completed
     * is illegal" line — that would have made a cancelled {@code draft} trip unarchivable, and a
     * cancelled draft is archive's single most likely real use (spec decision 8).
     *
     * @throws IllegalStateException if already archived — the caller checks and raises the domain
     *     conflict (409) first, so reaching here means a bug, not a user error
     */
    void archive() {
        if (state == WorkspaceState.ARCHIVED) {
            throw new IllegalStateException("Workspace " + id + " is already archived");
        }
        this.state = WorkspaceState.ARCHIVED;
    }

    /**
     * The owner brings the trip back (S1.9): {@code archived → active | completed}.
     *
     * <p><strong>The restored state is recomputed from the itinerary, never remembered</strong> (spec
     * decision 8) — hence the parameter. Below {@code ARCHIVED}, workspace state is derivable from the
     * itinerary (1:1), so a stored "previous state" would be the duplicated fact S1.7 rejected, with
     * the extra failure mode of drifting out of step during the archived window: a trip completed
     * while archived would come back {@code ACTIVE} and lie about itself.
     *
     * @param itineraryIsCompleted whether the trip's itinerary currently reads {@code completed}
     * @throws IllegalStateException if not archived — as {@link #archive}, the caller raises the 409
     */
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
