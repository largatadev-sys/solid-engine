package com.largata.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface FollowRequestRepository extends JpaRepository<FollowRequest, UUID> {

    @Query("""
            SELECT r FROM FollowRequest r
            WHERE r.requesterId = :requesterId
              AND r.targetId = :targetId
              AND r.status = com.largata.identity.FollowRequestStatus.PENDING
            """)
    Optional<FollowRequest> findPending(
            @Param("requesterId") UUID requesterId, @Param("targetId") UUID targetId);


    @Query("""
            SELECT r FROM FollowRequest r
            WHERE r.targetId = :targetId
              AND r.status = com.largata.identity.FollowRequestStatus.PENDING
            """)
    List<FollowRequest> findEveryPendingFor(@Param("targetId") UUID targetId);


    @Query(value = """
            SELECT * FROM follow_request r
            WHERE r.target_id = :targetId
              AND r.status = 'PENDING'
              AND (CAST(:cursorAt AS timestamptz) IS NULL
                   OR (r.requested_at, r.id)
                      < (CAST(:cursorAt AS timestamptz), CAST(:cursorId AS uuid)))
            ORDER BY r.requested_at DESC, r.id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<FollowRequest> inboxPage(
            @Param("targetId") UUID targetId,
            @Param("cursorAt") Instant cursorAt,
            @Param("cursorId") UUID cursorId,
            @Param("pageSize") int pageSize);
}
