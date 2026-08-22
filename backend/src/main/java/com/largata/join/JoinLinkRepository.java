package com.largata.join;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface JoinLinkRepository extends JpaRepository<JoinLink, UUID> {

    Optional<JoinLink> findByWorkspaceId(UUID workspaceId);


    Optional<JoinLink> findByToken(String token);
}
