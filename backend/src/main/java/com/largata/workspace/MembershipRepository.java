package com.largata.workspace;

import com.largata.common.authz.Role;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface MembershipRepository extends JpaRepository<Membership, MembershipId> {


    @Query("SELECT m.role FROM Membership m WHERE m.workspace.itineraryId = :itineraryId "
            + "AND m.travelerId = :travelerId")
    Optional<Role> findRole(@Param("travelerId") UUID travelerId, @Param("itineraryId") UUID itineraryId);


    @Query("SELECT m.workspace.itineraryId FROM Membership m WHERE m.travelerId = :travelerId "
            + "AND m.workspace.state = :state AND m.role = com.largata.common.authz.Role.OWNER")
    List<UUID> findOwnedItineraryIdsIn(@Param("travelerId") UUID travelerId, @Param("state") WorkspaceState state);


    @Query("SELECT m.workspace.itineraryId FROM Membership m WHERE m.travelerId = :travelerId "
            + "AND m.workspace.state <> :state")
    List<UUID> findItineraryIdsNotIn(@Param("travelerId") UUID travelerId, @Param("state") WorkspaceState state);



    @Query("SELECT m.travelerId FROM Membership m WHERE m.workspace.itineraryId = :itineraryId "
            + "AND m.role = com.largata.common.authz.Role.OWNER")
    Optional<UUID> findOwnerTravelerId(@Param("itineraryId") UUID itineraryId);


    @Query("SELECT new com.largata.workspace.MembershipView(m.travelerId, m.role, m.joinedAt) "
            + "FROM Membership m WHERE m.workspace.itineraryId = :itineraryId ORDER BY m.joinedAt ASC")
    List<MembershipView> findMembers(@Param("itineraryId") UUID itineraryId);


    @Modifying
    @Query("DELETE FROM Membership m WHERE m.travelerId = :travelerId AND m.workspace.id IN "
            + "(SELECT w.id FROM Workspace w WHERE w.itineraryId = :itineraryId)")
    int deleteMember(@Param("travelerId") UUID travelerId, @Param("itineraryId") UUID itineraryId);


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
