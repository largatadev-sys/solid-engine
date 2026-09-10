package com.largata.join.join.repository;

import com.largata.join.join.entity.JoinLink;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JoinLinkRepository extends JpaRepository<JoinLink, UUID> {

    Optional<JoinLink> findByWorkspaceId(UUID workspaceId);


    Optional<JoinLink> findByToken(String token);
}
