package com.largata.invitation;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private final InvitationRepository invitations;
    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final TravelerService travelers;
    private final AuthorizationGuard guard;
    private final WriteFence fence;
    private final InvitationMailer mailer;
    private final Analytics analytics;

    InvitationService(
            InvitationRepository invitations,
            WorkspaceService workspaces,
            ItineraryService itineraries,
            TravelerService travelers,
            AuthorizationGuard guard,
            WriteFence fence,
            InvitationMailer mailer,
            Analytics analytics) {
        this.fence = fence;
        this.invitations = invitations;
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.travelers = travelers;
        this.guard = guard;
        this.mailer = mailer;
        this.analytics = analytics;
    }



    @Transactional
    public PendingInvitation invite(Membership owner, String rawEmail) {
        if (!owner.isOwner()) {
            throw new NotWorkspaceOwnerException();
        }
        fence.requireWritable(owner);
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


    @Transactional
    public void revoke(UUID invitationId, UUID travelerId) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(invitation.workspaceId())).get(invitation.workspaceId());
        Membership caller = guard.requireMember(travelerId, itineraryId);
        if (!caller.isOwner()) {
            throw new NotWorkspaceOwnerException();
        }
        fence.requireWritable(caller);
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


    @Transactional
    public UUID accept(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation = liveInvitationFor(invitationId, contact);
        UUID workspaceId = invitation.workspaceId();
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(workspaceId)).get(workspaceId);

        Instant now = Instant.now();
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


    @Transactional(propagation = Propagation.MANDATORY)
    public int voidPendingInvitations(UUID workspaceId) {
        List<Invitation> pending = invitations.findByWorkspaceIdAndStatus(workspaceId, InvitationStatus.PENDING);
        if (pending.isEmpty()) {
            return 0;
        }
        Instant now = Instant.now();
        pending.forEach(invitation -> invitation.voidBySystem(now));
        invitations.saveAllAndFlush(pending);
        log.info("Pending invitations voided: workspaceId={} count={}", workspaceId, pending.size());
        return pending.size();
    }



    private Invitation liveInvitationFor(UUID invitationId, VerifiedContact contact) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        if (contact.email() == null || !invitation.email().equals(normalize(contact.email()))) {
            throw new InvitationNotFoundException();
        }
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
        invitations.saveAndFlush(pending);
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
            log.warn("Invitation email failed to send: invitationId={}", mail.invitationId(), sendFailedButTheInviteIsRecoverable);
        }
    }

    private static String normalize(String rawEmail) {
        return rawEmail.strip().toLowerCase(Locale.ROOT);
    }


    private void afterCommit(Runnable action) {
        AfterCommit.run(action);
    }
}
