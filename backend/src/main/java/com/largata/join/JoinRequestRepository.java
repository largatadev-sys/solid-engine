package com.largata.join;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface JoinRequestRepository extends JpaRepository<JoinRequest, UUID> {

    Optional<JoinRequest> findByWorkspaceIdAndTravelerIdAndStatus(
            UUID workspaceId, UUID travelerId, JoinRequestStatus status);


    List<JoinRequest> findByWorkspaceIdAndStatusOrderByCreatedAtAsc(
            UUID workspaceId, JoinRequestStatus status);


    List<JoinRequest> findByTravelerIdAndStatusOrderByCreatedAtDesc(
            UUID travelerId, JoinRequestStatus status);
}
