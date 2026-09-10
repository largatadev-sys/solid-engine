package com.largata.join.join.repository;

import com.largata.join.join.entity.JoinRequest;
import com.largata.join.join.entity.JoinRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JoinRequestRepository extends JpaRepository<JoinRequest, UUID> {

    Optional<JoinRequest> findByWorkspaceIdAndTravelerIdAndStatus(
            UUID workspaceId, UUID travelerId, JoinRequestStatus status);


    List<JoinRequest> findByWorkspaceIdAndStatusOrderByCreatedAtAsc(
            UUID workspaceId, JoinRequestStatus status);


    List<JoinRequest> findByTravelerIdAndStatusOrderByCreatedAtDesc(
            UUID travelerId, JoinRequestStatus status);
}
