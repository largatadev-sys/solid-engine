package com.largata.invitation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface InvitationRepository extends JpaRepository<Invitation, UUID> {


    Optional<Invitation> findByWorkspaceIdAndEmailAndStatus(UUID workspaceId, String email, InvitationStatus status);


    List<Invitation> findByWorkspaceIdAndStatusAndExpiresAtAfterOrderByIdDesc(
            UUID workspaceId, InvitationStatus status, Instant now);


    List<Invitation> findByEmailAndStatusAndExpiresAtAfterOrderByIdDesc(
            String email, InvitationStatus status, Instant now);


    List<Invitation> findByWorkspaceIdAndStatus(UUID workspaceId, InvitationStatus status);
}
