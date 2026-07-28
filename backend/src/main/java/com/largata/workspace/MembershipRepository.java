package com.largata.workspace;

import com.largata.common.authz.Role;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Membership persistence — and, in {@link #findRole}, the authorization guard's hot path.
 * Package-private like every repository here (ADR-002).
 */
interface MembershipRepository extends JpaRepository<Membership, MembershipId> {

    /**
     * The traveler's role on an itinerary, or empty — <strong>the query every read of every private
     * itinerary runs first</strong> (S1.1, ADR-011).
     *
     * <p>A projection of one column, not a load of the aggregate: the guard needs an answer, not an
     * object graph. It joins straight from the membership to its workspace's {@code itinerary_id},
     * so the itinerary module is never consulted — which is what keeps {@code common → workspace}
     * from closing into a cycle back through {@code itinerary} (ADR-011's whole reason for the seam).
     *
     * <p>Empty means "no standing" for every reason — no such itinerary, no workspace, not a member.
     * The three are indistinguishable here <em>by design</em>, and {@link
     * com.largata.common.authz.MembershipResolver} requires exactly that: Artifact 03's masking rule
     * says a probe must not learn an id is real from the shape of its rejection.
     */
    @Query("SELECT m.role FROM Membership m WHERE m.workspace.itineraryId = :itineraryId "
            + "AND m.travelerId = :travelerId")
    Optional<Role> findRole(@Param("travelerId") UUID travelerId, @Param("itineraryId") UUID itineraryId);

    /**
     * The itineraries this traveler is a member of whose workspace is in the given state (S1.9) — the
     * archived view.
     *
     * <p><strong>No role predicate, and that is deliberate</strong> (S1.6, the membership-scoped My
     * Trips). Since S1.1 the creator gets an {@code OWNER} membership row atomically with the trip, so
     * one membership-scoped query covers owned and joined alike with no union and no special case:
     * "trips I own" was only ever a subset of "trips I'm on", and treating it as the whole set is what
     * made joined trips invisible on their members' home screens (found at S1.5's device walk).
     *
     * <p>Returns ids rather than rows: the itinerary module owns the paging and the hydration, and the
     * ids are the whole of what crosses the module boundary (ADR-002). Served by V11's {@code
     * membership_traveler_idx}, the index V4 predicted and deferred to whichever story wrote this query.
     *
     * <p><strong>The unfiltered variant was deleted at S1.9</strong>, not left beside these two: it
     * carried the obvious name and would have returned archived and live trips mixed, so the next
     * caller to reach for it would have bypassed the archive filter without noticing.
     *
     * <p><strong>The filter belongs here, in the membership→ids step, not in the itinerary module's
     * page query</strong> (spec decision 10). Two reasons, both structural: archive is a
     * <em>workspace</em> fact, so filtering on it anywhere else would mean the itinerary module reading
     * another module's column (ADR-002); and narrowing the id set leaves S1.6's keyset seek — {@code id
     * < cursor}, ordered by id — completely untouched, so paging semantics are identical in both views.
     * A predicate added to the page query would have had to be carried in the cursor to stay stable.
     */
    @Query("SELECT m.workspace.itineraryId FROM Membership m WHERE m.travelerId = :travelerId "
            + "AND m.workspace.state = :state")
    List<UUID> findItineraryIdsIn(@Param("travelerId") UUID travelerId, @Param("state") WorkspaceState state);

    /**
     * The traveler's trips whose workspace is <em>not</em> in the given state (S1.9) — the default My
     * Trips list, which is everything except archived.
     *
     * <p>Two queries rather than one with a boolean predicate: HQL has no boolean-expression-as-value
     * form ({@code (a = b) = :flag} is a parse error, which is how this shape first announced itself),
     * and {@code <>} against a single state reads more plainly than either alternative.
     */
    @Query("SELECT m.workspace.itineraryId FROM Membership m WHERE m.travelerId = :travelerId "
            + "AND m.workspace.state <> :state")
    List<UUID> findItineraryIdsNotIn(@Param("travelerId") UUID travelerId, @Param("state") WorkspaceState state);

    // No "which of these are archived" bulk query, deliberately (S1.9): the list is filtered to one
    // side or the other before paging, so every row on a page carries the same archived value as the
    // request that asked for it. The flag is the request parameter; a per-page lookup would be a query
    // with no reader — the ship-when-read discipline that kept the state column itself deferred from
    // S1.1 to S1.9.

    /**
     * The traveler who currently owns the workspace around an itinerary (S1.6, the transfer's from-side).
     *
     * <p>Reads the membership rows rather than {@code itinerary.owner_id} deliberately: the row is the
     * authority (the column is a mirror kept in step by the transfer), and a transfer that trusted the
     * mirror could swap the wrong pair if the two ever diverged. INV-4 guarantees exactly one match.
     */
    @Query("SELECT m.travelerId FROM Membership m WHERE m.workspace.itineraryId = :itineraryId "
            + "AND m.role = com.largata.common.authz.Role.OWNER")
    Optional<UUID> findOwnerTravelerId(@Param("itineraryId") UUID itineraryId);

    /**
     * Every membership of one workspace, addressed by its itinerary (the member list, S1.2). Projected
     * straight to the public {@link MembershipView} — the entity never leaves the module — and ordered
     * by {@code joined_at} so the owner (joined at the trip's first instant) leads and members follow
     * in the order they accepted.
     */
    @Query("SELECT new com.largata.workspace.MembershipView(m.travelerId, m.role, m.joinedAt) "
            + "FROM Membership m WHERE m.workspace.itineraryId = :itineraryId ORDER BY m.joinedAt ASC")
    List<MembershipView> findMembers(@Param("itineraryId") UUID itineraryId);

    /**
     * Destroys one membership row — the only delete this table has (S1.5: removal and leave are the
     * same act at this layer, distinguished only by who asked).
     *
     * <p><strong>Returns the row count, and the caller depends on it.</strong> Zero means the row was
     * already gone — either an idempotent repeat or a lost race with a concurrent departure — which is
     * how {@code MembershipService} avoids emitting a second analytics event for one departure.
     *
     * <p>The workspace is reached by subquery on its {@code itinerary_id} rather than by dereferencing
     * {@code m.workspace.itineraryId} as the reads above do: a bulk {@code DELETE} cannot carry the
     * implicit join that dereference compiles to. {@code m.workspace.id} alone would be fine (it is
     * the FK column on this table), but the itinerary id is what callers hold, so the subquery does
     * that hop in SQL.
     */
    @Modifying
    @Query("DELETE FROM Membership m WHERE m.travelerId = :travelerId AND m.workspace.id IN "
            + "(SELECT w.id FROM Workspace w WHERE w.itineraryId = :itineraryId)")
    int deleteMember(@Param("travelerId") UUID travelerId, @Param("itineraryId") UUID itineraryId);

    /**
     * Moves one membership between roles — the two halves of an ownership transfer (S1.6).
     *
     * <p><strong>The {@code expectedRole} predicate is the concurrency defence, not decoration.</strong>
     * Two transfers racing on one workspace both read an {@code OWNER} row and both try to demote it;
     * with an unconditional UPDATE both would "succeed" and the second promote would leave two owners —
     * a lost update that V4's partial unique index would catch only by aborting a transaction somewhere
     * unhelpful. With the predicate, the loser's demote matches zero rows and the caller aborts on the
     * count. The invariant is enforced by the WHERE clause, and the count is how the caller learns.
     *
     * <p>{@code expectedRole} is compared against the enum, so this carries the same {@code
     * @Enumerated(STRING)} contract V4's partial index does — {@code MembershipStorageIT} pins that a
     * role's stored spelling moving would be caught rather than silently matching nothing.
     *
     * @return rows updated: 1 on success, 0 if the row was absent or no longer held {@code expectedRole}
     */
    @Modifying
    @Query("UPDATE Membership m SET m.role = :newRole WHERE m.travelerId = :travelerId "
            + "AND m.role = :expectedRole AND m.workspace.id IN "
            + "(SELECT w.id FROM Workspace w WHERE w.itineraryId = :itineraryId)")
    int changeRole(
            @Param("travelerId") UUID travelerId,
            @Param("itineraryId") UUID itineraryId,
            @Param("expectedRole") Role expectedRole,
            @Param("newRole") Role newRole);
}
