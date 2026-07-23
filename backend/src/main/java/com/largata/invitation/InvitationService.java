package com.largata.invitation;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.web.VerifiedContact;
import com.largata.invitation.InvitationExceptions.AlreadyMemberException;
import com.largata.invitation.InvitationExceptions.EmailNotVerifiedException;
import com.largata.invitation.InvitationExceptions.InvitationAlreadyPendingException;
import com.largata.invitation.InvitationExceptions.InvitationExpiredException;
import com.largata.invitation.InvitationExceptions.InvitationNotFoundException;
import com.largata.invitation.InvitationExceptions.InvitationNotPendingException;
import com.largata.invitation.InvitationExceptions.NotWorkspaceOwnerException;
import com.largata.itinerary.ItineraryService;
import com.largata.workspace.MembershipView;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The invitation module's one entry point (ADR-002) — email invite → accept → member (S1.2).
 *
 * <p><strong>This module sits above workspace, itinerary and identity and depends on all three</strong>
 * (see {@link Invitation}'s note on why it is not inside {@code workspace}): it composes the inbox and
 * member views from their service interfaces by id, never their tables, and it admits members through
 * {@link WorkspaceService} so membership rows are still written the one way they are ever written.
 *
 * <p><strong>Authority is split by addressing, matching the API.</strong> Owner-side acts (invite,
 * revoke, the pending list, the member list) are itinerary-addressed, so the controller resolves a
 * {@link Membership} through the guard and hands it here — role checks read {@code membership.isOwner()}
 * (this is role authority, not the entitlement seam). Invitee-side acts (accept, decline, inbox) are
 * invitation-addressed and the guard has no itinerary to resolve; their authority is the verified-email
 * match against the invitation row (grilling Q5–Q6), carried as a {@link VerifiedContact}.
 */
@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private final InvitationRepository invitations;
    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final TravelerService travelers;
    private final AuthorizationGuard guard;
    private final InvitationMailer mailer;
    private final Analytics analytics;

    InvitationService(
            InvitationRepository invitations,
            WorkspaceService workspaces,
            ItineraryService itineraries,
            TravelerService travelers,
            AuthorizationGuard guard,
            InvitationMailer mailer,
            Analytics analytics) {
        this.invitations = invitations;
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.travelers = travelers;
        this.guard = guard;
        this.mailer = mailer;
        this.analytics = analytics;
    }

    // --- Owner side (itinerary-addressed; authority = the guard's Membership + owner role) ---------

    /**
     * Opens an invitation to an email and sends the notification (S1.2). Owner-only.
     *
     * <p>The rejection ladder, in order: not the owner → 403; the address is already a member → 409;
     * a live invitation to it already exists → 409. An existing but <em>expired</em> pending row is
     * flipped to {@code EXPIRED} first (lazy expiry realised on the one path where it matters — the
     * re-invite), so the one-pending index never blocks a legitimate reissue.
     *
     * <p>The mail is dispatched after commit and its failure is isolated (see {@link #afterCommit}):
     * a Resend outage degrades to "created, email failed, revoke + re-invite", never a 500.
     */
    @Transactional
    public PendingInvitation invite(Membership owner, String rawEmail) {
        if (!owner.isOwner()) {
            throw new NotWorkspaceOwnerException();
        }
        UUID itineraryId = owner.itineraryId();
        String email = normalize(rawEmail);
        UUID workspaceId =
                workspaces
                        .workspaceIdOf(itineraryId)
                        .orElseThrow(() -> new IllegalStateException("Owner has no workspace — invariant breach"));

        if (isAlreadyMember(itineraryId, email)) {
            throw new AlreadyMemberException();
        }
        reconcileExistingPending(workspaceId, email);

        Instant now = Instant.now();
        Invitation invitation = invitations.save(Invitation.open(workspaceId, email, owner.travelerId(), now));
        log.info("Invitation opened: id={} workspaceId={} invitedBy={}", invitation.id(), workspaceId, owner.travelerId());

        InvitationMail mail =
                new InvitationMail(invitation.id(), email, tripTitle(itineraryId), inviterName(owner.travelerId()));
        afterCommit(
                () -> {
                    dispatch(mail);
                    analytics.emit(
                            AnalyticsEvent.named("invite_sent")
                                    .with("invitationId", invitation.id())
                                    .with("itineraryId", itineraryId)
                                    .with("invitedBy", owner.travelerId())
                                    .build());
                });
        return new PendingInvitation(invitation.id(), email, invitation.createdAt(), invitation.expiresAt());
    }

    /**
     * Revokes a pending invitation (S1.2). Owner-only; the row survives as {@code REVOKED}.
     *
     * <p><strong>Invitation-addressed, so authority is resolved here, not in the controller.</strong>
     * The other owner-side acts are itinerary-addressed and the controller guards them; revoke is
     * addressed by invitation id, so this loads the invitation, finds its itinerary, and runs the
     * caller through the guard — a non-member gets the guard's 404 (masking the invitation's
     * existence), a member-not-owner gets 403. Same authority, resolved one layer deeper because the
     * path shape gives the controller no itinerary to guard on.
     */
    @Transactional
    public void revoke(UUID invitationId, UUID travelerId) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(invitation.workspaceId())).get(invitation.workspaceId());
        Membership caller = guard.requireMember(travelerId, itineraryId); // 404-masks a non-member
        if (!caller.isOwner()) {
            throw new NotWorkspaceOwnerException();
        }
        if (invitation.status() != InvitationStatus.PENDING) {
            throw new InvitationNotPendingException();
        }
        invitation.revoke(Instant.now());
        invitations.saveAndFlush(invitation);
        log.info("Invitation revoked: id={} itineraryId={}", invitation.id(), itineraryId);
        afterCommit(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("invite_revoked")
                                        .with("invitationId", invitationId)
                                        .with("itineraryId", itineraryId)
                                        .build()));
    }

    /** The workspace's pending invitations, newest first — any member may read (INV-1). */
    @Transactional(readOnly = true)
    public List<PendingInvitation> pendingInvitations(Membership member) {
        UUID workspaceId = workspaces.workspaceIdOf(member.itineraryId()).orElseThrow();
        return invitations
                .findByWorkspaceIdAndStatusAndExpiresAtAfterOrderByIdDesc(
                        workspaceId, InvitationStatus.PENDING, Instant.now())
                .stream()
                .map(i -> new PendingInvitation(i.id(), i.email(), i.createdAt(), i.expiresAt()))
                .toList();
    }

    /** The workspace's members, owner first, names composed from identity — any member may read (INV-1). */
    @Transactional(readOnly = true)
    public List<MemberSummary> members(Membership member) {
        List<MembershipView> rows = workspaces.membersOf(member.itineraryId());
        Map<UUID, String> names = namesByIds(rows.stream().map(MembershipView::travelerId).toList());
        return rows.stream()
                .map(
                        m ->
                                new MemberSummary(
                                        m.travelerId(),
                                        names.getOrDefault(m.travelerId(), ""),
                                        m.role(),
                                        m.joinedAt()))
                .toList();
    }

    // --- Invitee side (invitation-addressed; authority = the verified-email match) ----------------

    /**
     * The caller's inbox: pending, unexpired invitations addressed to their <em>verified</em> email,
     * newest first (S1.2). An unverified caller gets an empty inbox — an unverified claim identifies
     * nobody (grilling Q5b), and returning matches would leak that an address was invited to someone
     * who has not proven they own it.
     */
    @Transactional(readOnly = true)
    public List<InboxInvitation> inbox(VerifiedContact contact) {
        if (!contact.verified() || contact.email() == null) {
            return List.of();
        }
        String email = normalize(contact.email());
        List<Invitation> rows =
                invitations.findByEmailAndStatusAndExpiresAtAfterOrderByIdDesc(
                        email, InvitationStatus.PENDING, Instant.now());
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, UUID> itineraryIds =
                workspaces.itineraryIdsByWorkspace(rows.stream().map(Invitation::workspaceId).toList());
        Map<UUID, String> titles = itineraries.titlesByIds(itineraryIds.values());
        Map<UUID, String> inviterNames = namesByIds(rows.stream().map(Invitation::invitedBy).toList());
        return rows.stream()
                .map(
                        i -> {
                            UUID itineraryId = itineraryIds.get(i.workspaceId());
                            return new InboxInvitation(
                                    i.id(),
                                    itineraryId,
                                    titles.getOrDefault(itineraryId, ""),
                                    inviterNames.getOrDefault(i.invitedBy(), ""),
                                    i.createdAt(),
                                    i.expiresAt());
                        })
                .toList();
    }

    /**
     * Accepts an invitation: the invitee joins as a {@code MEMBER} (S1.2, the joining transaction).
     *
     * <p>The gate, in order (grilling Q5b, Q6): the invitation must exist and be addressed to the
     * caller's email — else 404, masking existence from anyone it is not for; the caller's email must
     * be verified — else 403 {@code EMAIL_NOT_VERIFIED}; the invitation must be pending — else 409;
     * and unexpired — else 409. Only then, in this one transaction, is the membership written and the
     * status flipped, so a membership never commits while its invitation rolls back or the reverse.
     *
     * @param travelerId the accepting traveler (from {@code @CurrentTraveler}) — recorded as {@code
     *     accepted_by} and made a member
     * @return the itinerary id of the trip just joined, so the client can open it
     */
    @Transactional
    public UUID accept(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation = liveInvitationFor(invitationId, contact);
        UUID workspaceId = invitation.workspaceId();
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(workspaceId)).get(workspaceId);

        Instant now = Instant.now();
        // Flip and flush the invitation FIRST, then admit the member — one transaction, and this order
        // is what makes the atomicity test meaningful: the status is already written when admitMember
        // runs, so if the membership insert fails it is the *shared transaction's* rollback that undoes
        // the flip. saveAndFlush, not a bare mutation: nested read-only calls above can leave the
        // session in a flush mode a commit-time flush would skip (revoke was silently lost to this).
        invitation.accept(travelerId, now);
        invitations.saveAndFlush(invitation);
        workspaces.admitMember(itineraryId, travelerId, now);
        log.info("Invitation accepted: id={} itineraryId={} travelerId={}", invitationId, itineraryId, travelerId);
        afterCommit(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("invite_accepted")
                                        .with("invitationId", invitationId)
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", travelerId)
                                        .build()));
        return itineraryId;
    }

    /** Declines an invitation (S1.2): same verified-email gate as accept, no membership created. */
    @Transactional
    public void decline(UUID invitationId, VerifiedContact contact) {
        Invitation invitation = liveInvitationFor(invitationId, contact);
        invitation.decline(Instant.now());
        invitations.saveAndFlush(invitation);
        log.info("Invitation declined: id={}", invitationId);
        afterCommit(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("invite_declined").with("invitationId", invitationId).build()));
    }

    // --- internals --------------------------------------------------------------------------------

    /** Loads an invitation and runs the full verified-email + live-status gate shared by accept/decline. */
    private Invitation liveInvitationFor(UUID invitationId, VerifiedContact contact) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        // Email match FIRST: a caller this invitation is not addressed to gets 404, learning nothing.
        if (contact.email() == null || !invitation.email().equals(normalize(contact.email()))) {
            throw new InvitationNotFoundException();
        }
        // Then verification: the rightful-but-unverified recipient is told to verify (403, its own code).
        if (!contact.verified()) {
            throw new EmailNotVerifiedException();
        }
        Instant now = Instant.now();
        if (invitation.status() != InvitationStatus.PENDING) {
            throw new InvitationNotPendingException();
        }
        if (invitation.isExpired(now)) {
            throw new InvitationExpiredException();
        }
        return invitation;
    }

    private boolean isAlreadyMember(UUID itineraryId, String email) {
        return travelers.travelerIdsWithEmail(email).stream()
                .anyMatch(travelerId -> workspaces.isMember(itineraryId, travelerId));
    }

    /**
     * If a pending invitation to this address exists, either reject (still live) or expire it (past
     * its window) so the reissue can proceed. The expiry flip is the lazy transition realised on the
     * one path that needs it — nothing else would ever free the one-pending slot.
     */
    private void reconcileExistingPending(UUID workspaceId, String email) {
        Optional<Invitation> existing =
                invitations.findByWorkspaceIdAndEmailAndStatus(workspaceId, email, InvitationStatus.PENDING);
        if (existing.isEmpty()) {
            return;
        }
        Invitation pending = existing.get();
        if (!pending.isExpired(Instant.now())) {
            throw new InvitationAlreadyPendingException();
        }
        pending.expire(Instant.now());
        invitations.saveAndFlush(pending); // flush now, so the new PENDING row does not collide with it
    }

    private String tripTitle(UUID itineraryId) {
        return itineraries.titlesByIds(List.of(itineraryId)).getOrDefault(itineraryId, "your trip");
    }

    private String inviterName(UUID travelerId) {
        return namesByIds(List.of(travelerId)).getOrDefault(travelerId, "A traveler");
    }

    private Map<UUID, String> namesByIds(List<UUID> travelerIds) {
        return travelers.summariesByIds(travelerIds).stream()
                .collect(java.util.stream.Collectors.toMap(TravelerSummary::id, TravelerSummary::displayName));
    }

    private void dispatch(InvitationMail mail) {
        try {
            mailer.send(mail);
        } catch (RuntimeException sendFailedButTheInviteIsRecoverable) {
            // Send-after-commit, log-don't-retry (spec §Email): the invitation exists; a failed send
            // is recoverable by revoke + re-invite. Never a 500, never a retry queue.
            log.warn("Invitation email failed to send: invitationId={}", mail.invitationId(), sendFailedButTheInviteIsRecoverable);
        }
    }

    private static String normalize(String rawEmail) {
        return rawEmail.strip().toLowerCase(Locale.ROOT);
    }

    /**
     * Runs an action once the current transaction has committed — mail dispatch and analytics both:
     * neither should report or act on an invitation a later rollback erases, and both stay off the
     * request's critical path. Delegates to the shared {@link AfterCommit} (extracted at S1.3 review,
     * where this same block existed verbatim in three services); kept as a private method so the call
     * sites read {@code afterCommit(...)} unchanged.
     */
    private void afterCommit(Runnable action) {
        AfterCommit.run(action);
    }
}
