package com.largata.poll;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface PollRepository extends JpaRepository<Poll, UUID> {

    @EntityGraph(attributePaths = "options")
    @Query("SELECT p FROM Poll p WHERE p.workspaceId = :workspaceId ORDER BY p.id DESC")
    List<Poll> boardOf(@Param("workspaceId") UUID workspaceId);


    @EntityGraph(attributePaths = "options")
    Optional<Poll> findByIdAndWorkspaceId(UUID id, UUID workspaceId);


    @Query(
            """
            SELECT COUNT(p) FROM Poll p
            WHERE p.workspaceId = :workspaceId
              AND p.closedAt IS NULL
              AND p.closesAt > :now
            """)
    long countOpenIn(@Param("workspaceId") UUID workspaceId, @Param("now") Instant now);
}
