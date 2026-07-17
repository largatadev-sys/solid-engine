package com.largata.workspace;

import com.largata.common.authz.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
