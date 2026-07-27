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
}
