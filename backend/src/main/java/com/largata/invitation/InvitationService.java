package com.largata.invitation;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.authz.PublicationState;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.ProfileVisibility;
import com.largata.identity.TravelerSummary;
import com.largata.identity.web.VerifiedContact;
import com.largata.invitation.InvitationExceptions.AlreadyMemberException;
import com.largata.invitation.InvitationExceptions.EmailNotVerifiedException;
import com.largata.invitation.InvitationExceptions.InvitationAlreadyPendingException;
import com.largata.invitation.InvitationExceptions.InvitationExpiredException;
import com.largata.invitation.InvitationExceptions.InvitationNotFoundException;
import com.largata.invitation.InvitationExceptions.InvitationNotPendingException;
import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.TripTeaser;
import com.largata.workspace.MembershipView;
import com.largata.workspace.WorkspaceService;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);

    private static final int GOING_PREVIEW_SIZE = 3;

    private final InvitationRepository invitations;
    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final TravelerService travelers;
    private final AuthorizationGuard guard;
    private final WriteFence fence;
    private final PublicationState publication;
    private final InboxTopic inbox;
    private final InvitationMailer mailer;
    private final Analytics analytics;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    InvitationService(
            InvitationRepository invitations,
            WorkspaceService workspaces,
            ItineraryService itineraries,
            TravelerService travelers,
            AuthorizationGuard guard,
            WriteFence fence,
            PublicationState publication,
            InvitationMailer mailer,
            Analytics analytics,
            ApplicationEventPublisher events,
            InboxTopic inbox,
            Clock clock) {
        this.inbox = inbox;
        this.fence = fence;
        this.publication = publication;
        this.events = events;
        this.invitations = invitations;
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.travelers = travelers;
        this.guard = guard;
        this.mailer = mailer;
        this.analytics = analytics;
        this.clock = clock;
    }



    @Transactional
    public PendingInvitation invite(Membership member, String rawEmail) {
        UUID itineraryId = member.itineraryId();
        UUID workspaceId = authorizeIssuance(member);
        String email = normalize(rawEmail);

        if (isAlreadyMember(itineraryId, email)) {
            throw new AlreadyMemberException();
        }
        reconcileExistingPending(workspaceId, email);
        travelers.travelerIdsWithEmail(email).forEach(id -> reconcileExistingPendingFor(workspaceId, id));

        Instant now = Instant.now(clock);
        Invitation invitation = invitations.save(Invitation.open(workspaceId, email, member.travelerId(), now));
        log.info("Invitation opened: id={} workspaceId={} invitedBy={}", invitation.id(), workspaceId, member.travelerId());

        InvitationMail mail =
                new InvitationMail(invitation.id(), email, tripTitle(itineraryId), inviterName(member.travelerId()));
        afterCommit(
                () -> {
                    dispatch(mail);
                    emitSent(invitation.id(), itineraryId, member.travelerId(), "email");
                });
        return pendingOf(invitation, null, handleOf(member.travelerId()));
    }


    @Transactional
    public PendingInvitation inviteByHandle(Membership member, String rawHandle) {
        UUID itineraryId = member.itineraryId();
        UUID workspaceId = authorizeIssuance(member);
        TravelerSummary invitee =
                travelers.byExactHandle(rawHandle).orElseThrow(NoSuchHandleException::new);

        if (workspaces.isMember(itineraryId, invitee.id())) {
            throw new AlreadyMemberException();
        }
        reconcileExistingPendingFor(workspaceId, invitee.id());

        Instant now = Instant.now(clock);
        Invitation invitation =
                invitations.save(Invitation.openFor(workspaceId, invitee.id(), member.travelerId(), now));
        log.info(
                "Invitation opened by handle: id={} workspaceId={} invitedBy={} invitee={}",
                invitation.id(),
                workspaceId,
                member.travelerId(),
                invitee.id());
        afterCommit(() -> emitSent(invitation.id(), itineraryId, member.travelerId(), "handle"));
        inbox.broadcastInvitationReceived(
                invitee.id(),
                inboxCardOf(invitation, itineraryId, travelers.summariesByIds(List.of(member.travelerId()))
                        .stream()
                        .findFirst()
                        .orElse(null)));
        return pendingOf(invitation, invitee.handle(), handleOf(member.travelerId()));
    }


    private UUID authorizeIssuance(Membership member) {
        fence.requireMembershipMutable(member);
        return workspaces
                .workspaceIdOf(member.itineraryId())
                .orElseThrow(() -> new IllegalStateException("Member has no workspace - invariant breach"));
    }


    private void emitSent(UUID invitationId, UUID itineraryId, UUID invitedBy, String addressing) {
        analytics.emit(
                AnalyticsEvent.named("invite_sent")
                        .with("invitationId", invitationId)
                        .with("itineraryId", itineraryId)
                        .with("invitedBy", invitedBy)
                        .with("addressing", addressing)
                        .build());
    }


    private static PendingInvitation pendingOf(
            Invitation invitation, String inviteeHandle, String inviterHandle) {
        return new PendingInvitation(
                invitation.id(),
                invitation.email(),
                invitation.inviteeTravelerId(),
                inviteeHandle,
                inviterHandle,
                invitation.createdAt(),
                invitation.expiresAt());
    }


    @Transactional
    public void revoke(UUID invitationId, UUID travelerId) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(invitation.workspaceId())).get(invitation.workspaceId());
        Membership caller = guard.requireMember(travelerId, itineraryId);
        fence.requireMembershipMutable(caller);
        if (invitation.status() != InvitationStatus.PENDING) {
            throw new InvitationNotPendingException();
        }
        invitation.revoke(Instant.now(clock));
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
        if (publication.isPublished(member.itineraryId())) {
            return List.of();
        }
        UUID workspaceId = workspaces.workspaceIdOf(member.itineraryId()).orElseThrow();
        List<Invitation> rows =
                invitations.findByWorkspaceIdAndStatusAndExpiresAtAfterOrderByIdDesc(
                        workspaceId, InvitationStatus.PENDING, Instant.now(clock));
        List<UUID> named =
                Stream.concat(
                                rows.stream().map(Invitation::inviteeTravelerId).filter(Objects::nonNull),
                                rows.stream().map(Invitation::invitedBy))
                        .distinct()
                        .toList();
        Map<UUID, String> handles = handlesByIds(named);
        return rows.stream()
                .map(
                        i ->
                                pendingOf(
                                        i,
                                        i.isAddressedByEmail() ? null : handles.get(i.inviteeTravelerId()),
                                        handles.get(i.invitedBy())))
                .toList();
    }


    @Transactional(readOnly = true)
    public List<MemberSummary> members(Membership member) {
        List<MembershipView> rows = workspaces.membersOf(member.itineraryId());
        Map<UUID, TravelerSummary> profiles =
                travelers.summariesByIds(rows.stream().map(MembershipView::travelerId).toList()).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, summary -> summary));
        return rows.stream().map(m -> memberSummaryOf(m, profileOf(profiles, m.travelerId()))).toList();
    }


    private static MemberSummary memberSummaryOf(MembershipView m, TravelerSummary profile) {
        return new MemberSummary(
                m.travelerId(),
                profile.displayName(),
                profile.avatarUrl(),
                m.role(),
                m.joinedAt(),
                profile.handle(),
                profile.bio(),
                profile.vanityNumber());
    }


    private static TravelerSummary profileOf(Map<UUID, TravelerSummary> profiles, UUID travelerId) {
        return profiles.getOrDefault(
                travelerId,
                new TravelerSummary(
                        travelerId, "", null, null, null, null, ProfileVisibility.PUBLIC));
    }



    @Transactional(readOnly = true)
    public List<InboxInvitation> inbox(VerifiedContact contact, UUID travelerId) {
        Instant now = Instant.now(clock);
        List<Invitation> rows =
                new ArrayList<>(
                        invitations.findByInviteeTravelerIdAndStatusAndExpiresAtAfterOrderByIdDesc(
                                travelerId, InvitationStatus.PENDING, now));
        if (contact.verified() && contact.email() != null) {
            rows.addAll(
                    invitations.findByEmailAndStatusAndExpiresAtAfterOrderByIdDesc(
                            normalize(contact.email()), InvitationStatus.PENDING, now));
        }
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, UUID> itineraryIds =
                workspaces.itineraryIdsByWorkspace(rows.stream().map(Invitation::workspaceId).toList());
        Set<UUID> frozen = publication.publishedAmong(itineraryIds.values());
        List<Invitation> live =
                rows.stream().filter(i -> !frozen.contains(itineraryIds.get(i.workspaceId()))).toList();
        if (live.isEmpty()) {
            return List.of();
        }
        List<UUID> inviterIds = live.stream().map(Invitation::invitedBy).distinct().toList();
        Map<UUID, TravelerSummary> inviters =
                travelers.summariesByIds(inviterIds).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, summary -> summary));
        return live.stream()
                .map(i -> inboxCardOf(i, itineraryIds.get(i.workspaceId()), inviters.get(i.invitedBy())))
                .toList();
    }


    private InboxInvitation inboxCardOf(Invitation invitation, UUID itineraryId, TravelerSummary inviter) {
        Optional<TripTeaser> trip = itineraries.teaserOf(itineraryId);
        List<MembershipView> roster = workspaces.membersOf(itineraryId);
        return new InboxInvitation(
                invitation.id(),
                itineraryId,
                trip.map(TripTeaser::title).orElse(""),
                inviter == null ? "" : inviter.displayName(),
                inviter == null ? null : inviter.handle(),
                trip.map(TripTeaser::destination).orElse(null),
                trip.map(TripTeaser::startDate).orElse(null),
                trip.map(TripTeaser::endDate).orElse(null),
                trip.map(t -> t.coverImageUrl() != null).orElse(false),
                goingPreviewOf(roster),
                roster.size(),
                invitation.createdAt(),
                invitation.expiresAt());
    }


    private List<InboxInvitation.GoingTraveler> goingPreviewOf(List<MembershipView> roster) {
        List<UUID> shown =
                roster.stream().map(MembershipView::travelerId).limit(GOING_PREVIEW_SIZE).toList();
        Map<UUID, TravelerSummary> profiles =
                travelers.summariesByIds(shown).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, summary -> summary));
        return shown.stream()
                .map(profiles::get)
                .filter(Objects::nonNull)
                .map(
                        p ->
                                new InboxInvitation.GoingTraveler(
                                        p.id(), p.displayName(), p.avatarUrl()))
                .toList();
    }


    @Transactional(readOnly = true)
    public UUID itineraryOfInvitationTo(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation = liveInvitationFor(invitationId, contact, travelerId);
        UUID workspaceId = invitation.workspaceId();
        UUID itineraryId = workspaces.itineraryIdsByWorkspace(List.of(workspaceId)).get(workspaceId);
        if (itineraryId == null) {
            throw new InvitationNotFoundException();
        }
        return itineraryId;
    }


    @Transactional
    public UUID accept(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation = liveInvitationFor(invitationId, contact, travelerId);
        UUID workspaceId = invitation.workspaceId();
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(workspaceId)).get(workspaceId);
        if (workspaces.isMember(itineraryId, travelerId)) {
            throw new AlreadyMemberException("You are already a member of this trip.");
        }
        fence.requireMembershipUnfrozen(itineraryId);

        Instant now = Instant.now(clock);
        invitation.accept(travelerId, now);
        invitations.saveAndFlush(invitation);
        workspaces.admitMember(itineraryId, travelerId, now);
        events.publishEvent(new MembershipArrived(workspaceId, travelerId));
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
    public void decline(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation = liveInvitationFor(invitationId, contact, travelerId);
        invitation.decline(Instant.now(clock));
        invitations.saveAndFlush(invitation);
        log.info("Invitation declined: id={}", invitationId);
        afterCommit(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("invite_declined").with("invitationId", invitationId).build()));
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void supersedePendingInvitationsFor(UUID workspaceId, UUID inviteeTravelerId) {
        invitations
                .findByWorkspaceIdAndInviteeTravelerIdAndStatus(
                        workspaceId, inviteeTravelerId, InvitationStatus.PENDING)
                .ifPresent(
                        open -> {
                            open.voidBySystem(Instant.now(clock));
                            invitations.saveAndFlush(open);
                            log.info(
                                    "Invitation superseded by an approved join request: id={} invitee={}",
                                    open.id(),
                                    inviteeTravelerId);
                        });
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public int voidPendingInvitations(UUID workspaceId) {
        List<Invitation> pending = invitations.findByWorkspaceIdAndStatus(workspaceId, InvitationStatus.PENDING);
        if (pending.isEmpty()) {
            return 0;
        }
        Instant now = Instant.now(clock);
        pending.forEach(invitation -> invitation.voidBySystem(now));
        invitations.saveAllAndFlush(pending);
        log.info("Pending invitations voided: workspaceId={} count={}", workspaceId, pending.size());
        return pending.size();
    }



    private Invitation liveInvitationFor(UUID invitationId, VerifiedContact contact, UUID travelerId) {
        Invitation invitation =
                invitations.findById(invitationId).orElseThrow(InvitationNotFoundException::new);
        if (invitation.isAddressedByEmail()) {
            if (contact.email() == null || !invitation.email().equals(normalize(contact.email()))) {
                throw new InvitationNotFoundException();
            }
            if (!contact.verified()) {
                throw new EmailNotVerifiedException();
            }
        } else if (!invitation.isAddressedTo(travelerId)) {
            throw new InvitationNotFoundException();
        }
        Instant now = Instant.now(clock);
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
        expireOrRefuse(
                invitations.findByWorkspaceIdAndEmailAndStatus(workspaceId, email, InvitationStatus.PENDING));
    }


    private void reconcileExistingPendingFor(UUID workspaceId, UUID inviteeTravelerId) {
        expireOrRefuse(
                invitations.findByWorkspaceIdAndInviteeTravelerIdAndStatus(
                        workspaceId, inviteeTravelerId, InvitationStatus.PENDING));
    }


    private void expireOrRefuse(Optional<Invitation> existing) {
        if (existing.isEmpty()) {
            return;
        }
        Invitation pending = existing.get();
        if (!pending.isExpired(Instant.now(clock))) {
            throw new InvitationAlreadyPendingException();
        }
        pending.expire(Instant.now(clock));
        invitations.saveAndFlush(pending);
    }


    private String handleOf(UUID travelerId) {
        return travelers.summaryById(travelerId).map(TravelerSummary::handle).orElse(null);
    }


    private Map<UUID, String> handlesByIds(List<UUID> travelerIds) {
        if (travelerIds.isEmpty()) {
            return Map.of();
        }
        return travelers.summariesByIds(travelerIds).stream()
                .filter(summary -> summary.handle() != null)
                .collect(Collectors.toMap(TravelerSummary::id, TravelerSummary::handle));
    }

    private String tripTitle(UUID itineraryId) {
        return itineraries.titlesByIds(List.of(itineraryId)).getOrDefault(itineraryId, "your trip");
    }

    private String inviterName(UUID travelerId) {
        return namesByIds(List.of(travelerId)).getOrDefault(travelerId, "A traveler");
    }

    private Map<UUID, String> namesByIds(List<UUID> travelerIds) {
        return travelers.summariesByIds(travelerIds).stream()
                .collect(Collectors.toMap(TravelerSummary::id, TravelerSummary::displayName));
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
