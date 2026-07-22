package com.largata.workspace;

import com.largata.common.authz.Role;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The workspace module's one entry point (ADR-002: modules are reached by service interface, never
 * by another module's tables).
 *
 * <p>S1.1 gives it exactly one method. The member-facing surface — invite, accept, remove, leave,
 * transfer ownership — arrives with the stories that own it (S1.2, S1.5, S1.6).
 */
@Service
public class WorkspaceService {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceService.class);

    private final WorkspaceRepository workspaces;
    private final MembershipRepository memberships;

    @PersistenceContext private EntityManager entityManager;

    WorkspaceService(WorkspaceRepository workspaces, MembershipRepository memberships) {
        this.workspaces = workspaces;
        this.memberships = memberships;
    }

    /**
     * Opens the workspace around a newly-created itinerary, with its creator as {@code OWNER}.
     *
     * <p><strong>{@link Propagation#MANDATORY}, and that is the method's most important line.</strong>
     * Artifact 03 requires that no ownerless window ever exists — the workspace and its owner
     * membership must commit with the itinerary or not at all. {@code MANDATORY} makes that a
     * property the caller <em>cannot get wrong</em>: called outside a transaction it throws rather
     * than quietly opening its own and committing independently of an itinerary that may still roll
     * back. {@code REQUIRED} (the default) would have been the silent version of this bug — and
     * silence is what this codebase keeps paying for (S0.2's {@code getTokens()}, S0.4's inlining).
     *
     * <p>No {@code Membership} parameter and no guard call, deliberately: this is the act that
     * <em>establishes</em> membership. There is nothing to authorize against until it returns —
     * exactly the reasoning {@code ItineraryService.create} records for the same absence.
     *
     * @param formedAt the itinerary's creation instant — see {@link Workspace#formAround}
     * @throws org.springframework.transaction.IllegalTransactionStateException if called without an
     *     active transaction
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void formAround(UUID itineraryId, UUID ownerTravelerId, Instant formedAt) {
        Workspace workspace = workspaces.save(Workspace.formAround(itineraryId, ownerTravelerId, formedAt));
        // Ids only, never a title (P3). One line, on the operation that opens the walls.
        log.info(
                "Workspace formed: id={} itineraryId={} ownerId={}",
                workspace.id(),
                itineraryId,
                ownerTravelerId);
    }

    /**
     * Admits a traveler into a workspace as a {@code MEMBER} (S1.2, invite acceptance).
     *
     * <p><strong>{@link Propagation#MANDATORY}, for {@code formAround}'s reason.</strong> Accepting an
     * invitation must write the membership row and flip the invitation's status in one transaction —
     * a membership that commits while its invitation rolls back (or the reverse) is the silent
     * half-state this codebase keeps paying for. {@code MANDATORY} makes it impossible to call this
     * outside the caller's transaction: {@code InvitationService.accept} opens it, this joins it, and a
     * stray call with no transaction throws rather than committing a membership on its own.
     *
     * <p>A single-row INSERT via {@code EntityManager.persist}, not the aggregate root: admitting one
     * member to an existing workspace is one row, and persist gives the true-INSERT semantics the
     * duplicate check and the accept-atomicity guarantee both need (see the body). {@code formAround}
     * still goes through the root, because it writes a workspace and its owner as one new aggregate.
     *
     * @throws IllegalStateException if no workspace exists for the itinerary — an invariant breach
     *     (INV: no itinerary without a workspace), not a user error, so it fails loud rather than 404s
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void admitMember(UUID itineraryId, UUID travelerId, Instant joinedAt) {
        Workspace workspace =
                workspaces
                        .findByItineraryId(itineraryId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No workspace for itinerary " + itineraryId + " — invariant breach"));
        // persist + flush, NOT repository.save: an INSERT, unconditionally. Spring Data's save() does
        // a *merge* for an assigned-id / composite-key entity (its isNew() reads the always-set id as
        // "existing"), which for a duplicate would silently SELECT-then-UPDATE the existing row rather
        // than fail — both the wrong semantics (admitting a member must never overwrite one) and the
        // reason the accept-atomicity test saw no error. persist() schedules a true INSERT, so a
        // duplicate hits the (workspace_id, traveler_id) primary key here, synchronously, and rolls
        // the whole accept back. formAround still writes through the root (workspace + owner as one new
        // aggregate); admitting one member to an existing workspace is a single-row insert.
        entityManager.persist(new Membership(workspace, travelerId, Role.MEMBER, joinedAt));
        entityManager.flush();
        log.info("Member admitted: itineraryId={} travelerId={}", itineraryId, travelerId);
    }

    /** Whether a traveler already holds any membership in the workspace around an itinerary (S1.2). */
    @Transactional(readOnly = true)
    public boolean isMember(UUID itineraryId, UUID travelerId) {
        return memberships.findRole(travelerId, itineraryId).isPresent();
    }

    /** The workspace id around an itinerary, or empty if none exists (S1.2, for invitation creation). */
    @Transactional(readOnly = true)
    public Optional<UUID> workspaceIdOf(UUID itineraryId) {
        return workspaces.findByItineraryId(itineraryId).map(Workspace::id);
    }

    /** The members of the workspace around an itinerary, owner first (S1.2, the member list). */
    @Transactional(readOnly = true)
    public List<MembershipView> membersOf(UUID itineraryId) {
        return memberships.findMembers(itineraryId);
    }

    /**
     * Resolves a set of workspace ids to their itinerary ids (S1.2, the inbox composition): the inbox
     * holds invitations keyed by {@code workspace_id}, and their trip titles live in the itinerary
     * module keyed by itinerary id, so this is the one hop between them.
     */
    @Transactional(readOnly = true)
    public Map<UUID, UUID> itineraryIdsByWorkspace(Collection<UUID> workspaceIds) {
        return workspaces.findAllById(workspaceIds).stream()
                .collect(Collectors.toMap(Workspace::id, Workspace::itineraryId));
    }
}
