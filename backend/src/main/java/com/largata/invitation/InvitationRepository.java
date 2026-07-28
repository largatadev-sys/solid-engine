package com.largata.invitation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Invitation persistence. Package-private surface: the module is reached via {@link InvitationService}
 * (ADR-002).
 *
 * <p>The read finders take {@code now} and filter on {@code expiresAt} because expiry is lazy
 * (grilling Q4): an expired invitation keeps {@code status = PENDING} until something touches it, so
 * every read that must not return expired rows excludes them by instant rather than by status.
 */
interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    /**
     * Any existing PENDING invitation for this address in this workspace — the one the create path
     * inspects to decide between a 409 (still live) and a lazy expiry-then-reissue (past its window).
     * Not filtered by instant: the create path needs the row even when it is an expired-pending one,
     * precisely so it can flip it to EXPIRED and free the one-pending slot the unique index guards.
     */
    Optional<Invitation> findByWorkspaceIdAndEmailAndStatus(UUID workspaceId, String email, InvitationStatus status);

    /** The owner-visible pending list for one workspace, newest first, expired rows excluded. */
    List<Invitation> findByWorkspaceIdAndStatusAndExpiresAtAfterOrderByIdDesc(
            UUID workspaceId, InvitationStatus status, Instant now);

    /** The inbox: pending, unexpired invitations addressed to one email, newest first. */
    List<Invitation> findByEmailAndStatusAndExpiresAtAfterOrderByIdDesc(
            String email, InvitationStatus status, Instant now);

    /**
     * Every pending invitation in one workspace, <strong>including past-its-window rows</strong> (S1.9's
     * archive void).
     *
     * <p>Deliberately not filtered by {@code expiresAt}, unlike the owner-visible list above: archive is
     * closing the workspace down, and a row that behaves expired but still reads {@code PENDING} would
     * be left holding the one-pending-per-address slot the V6 unique index guards. Voiding it costs
     * nothing and leaves no ambiguous rows behind.
     */
    List<Invitation> findByWorkspaceIdAndStatus(UUID workspaceId, InvitationStatus status);
}
