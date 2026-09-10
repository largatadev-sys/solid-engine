package com.largata.invitation.repository;

import com.largata.invitation.entity.Invitation;
import com.largata.invitation.entity.InvitationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {


    Optional<Invitation> findByWorkspaceIdAndEmailAndStatus(UUID workspaceId, String email, InvitationStatus status);


    List<Invitation> findByWorkspaceIdAndStatusAndExpiresAtAfterOrderByIdDesc(
            UUID workspaceId, InvitationStatus status, Instant now);


    Optional<Invitation> findByWorkspaceIdAndInviteeTravelerIdAndStatus(
            UUID workspaceId, UUID inviteeTravelerId, InvitationStatus status);


    List<Invitation> findByEmailAndStatusAndExpiresAtAfterOrderByIdDesc(
            String email, InvitationStatus status, Instant now);


    List<Invitation> findByInviteeTravelerIdAndStatusAndExpiresAtAfterOrderByIdDesc(
            UUID inviteeTravelerId, InvitationStatus status, Instant now);


    List<Invitation> findByWorkspaceIdAndStatus(UUID workspaceId, InvitationStatus status);
}
