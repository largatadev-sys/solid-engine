package com.largata.join;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.web.VerifiedContact;
import com.largata.invitation.InvitationService;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.ShareCardVersionService;
import com.largata.itinerary.TripTeaser;
import com.largata.join.JoinExceptions.AlreadyMemberException;
import com.largata.join.JoinExceptions.EmailNotVerifiedException;
import com.largata.join.JoinExceptions.JoinRequestNotFoundException;
import com.largata.join.JoinExceptions.JoinRequestNotPendingException;
import com.largata.join.JoinExceptions.LinkClosedException;
import com.largata.join.JoinExceptions.NotTripOwnerException;
import com.largata.join.JoinExceptions.UnknownJoinTokenException;
import com.largata.workspace.MembershipView;
import com.largata.workspace.WorkspaceService;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class JoinService {

    private static final Logger log = LoggerFactory.getLogger(JoinService.class);

    private static final int TOKEN_BYTES = 8;

    private static final int TOKEN_LOG_PREFIX = 8;

    private static final int GOING_PREVIEW_SIZE = 3;

    private final JoinLinkRepository links;
    private final JoinRequestRepository requests;
    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final TravelerService travelers;
    private final InvitationService invitations;
    private final WriteFence fence;
    private final Analytics analytics;
    private final Clock clock;
    private final ShareCardVersionService shareCardVersions;
    private final SecureRandom random = new SecureRandom();
    private final String webBaseUrl;

    JoinService(
            JoinLinkRepository links,
            JoinRequestRepository requests,
            WorkspaceService workspaces,
            ItineraryService itineraries,
            TravelerService travelers,
            InvitationService invitations,
            WriteFence fence,
            Analytics analytics,
            Clock clock,
            ShareCardVersionService shareCardVersions,
            @Value("${largata.web.base-url:http://localhost:8081}") String webBaseUrl) {
        this.links = links;
        this.requests = requests;
        this.workspaces = workspaces;
        this.itineraries = itineraries;
        this.travelers = travelers;
        this.invitations = invitations;
        this.fence = fence;
        this.analytics = analytics;
        this.clock = clock;
        this.shareCardVersions = shareCardVersions;
        this.webBaseUrl = webBaseUrl;
    }


    @Transactional
    public JoinLinkView linkFor(Membership member) {
        fence.requireMembershipMutable(member);
        UUID workspaceId = workspaceIdOf(member.itineraryId());
        JoinLink link = links.findByWorkspaceId(workspaceId).orElseGet(() -> mint(workspaceId));
        return new JoinLinkView(
                link.token(),
                versionedShareUrlOf(
                        link.token(), shareCardVersions.currentVersion(member.itineraryId())));
    }


    private JoinLink mint(UUID workspaceId) {
        try {
            JoinLink minted =
                    links.saveAndFlush(JoinLink.mint(workspaceId, freshToken(), Instant.now(clock)));
            log.info(
                    "Join link minted: workspaceId={} tokenPrefix={}",
                    workspaceId,
                    prefixOf(minted.token()));
            return minted;
        } catch (DataIntegrityViolationException anotherReaderMintedFirst) {
            return links.findByWorkspaceId(workspaceId).orElseThrow(() -> anotherReaderMintedFirst);
        }
    }


    private String freshToken() {
        byte[] entropy = new byte[TOKEN_BYTES];
        random.nextBytes(entropy);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
    }


    private String versionedShareUrlOf(String token, long shareCardVersion) {
        return JoinUrls.landingUrl(webBaseUrl, token, shareCardVersion);
    }


    @Transactional(readOnly = true)
    public JoinTeaser teaserFor(String token, Optional<UUID> viewerId) {
        JoinTeaser teaser = teaserOf(token, viewerId);
        emitTeaserViewed(teaser.itineraryId(), viewerId.isPresent(), teaser.viewerState());
        return teaser;
    }


    @Transactional(readOnly = true)
    public JoinTeaser cardTeaserFor(String token) {
        return teaserOf(token, Optional.empty());
    }


    private JoinTeaser teaserOf(String token, Optional<UUID> viewerId) {
        JoinLink link = links.findByToken(token).orElseThrow(UnknownJoinTokenException::new);
        UUID itineraryId = itineraryIdOf(link.workspaceId());
        TripTeaser trip = itineraries.teaserOf(itineraryId).orElseThrow(UnknownJoinTokenException::new);

        return new JoinTeaser(
                itineraryId,
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                workspaces.membersOf(itineraryId).size(),
                trip.coverImageUrl(),
                viewerStateOf(link, itineraryId, trip, viewerId));
    }


    private ViewerJoinState viewerStateOf(
            JoinLink link, UUID itineraryId, TripTeaser trip, Optional<UUID> viewerId) {
        if (viewerId.isPresent() && workspaces.isMember(itineraryId, viewerId.get())) {
            return ViewerJoinState.MEMBER;
        }
        if (isClosed(itineraryId, trip)) {
            return ViewerJoinState.DEAD;
        }
        if (viewerId.isEmpty()) {
            return ViewerJoinState.SIGNED_OUT;
        }
        return pendingRequestOf(link.workspaceId(), viewerId.get()).isPresent()
                ? ViewerJoinState.PENDING
                : ViewerJoinState.CAN_REQUEST;
    }


    private boolean isClosed(UUID itineraryId, TripTeaser trip) {
        return trip.published() || workspaces.isArchived(itineraryId);
    }


    @Transactional(readOnly = true)
    public UUID itineraryBehind(String token) {
        JoinLink link = links.findByToken(token).orElseThrow(UnknownJoinTokenException::new);
        return itineraryIdOf(link.workspaceId());
    }


    @Transactional
    public ViewerJoinState request(String token, VerifiedContact contact, UUID travelerId) {
        JoinLink link = links.findByToken(token).orElseThrow(UnknownJoinTokenException::new);
        UUID itineraryId = itineraryIdOf(link.workspaceId());
        TripTeaser trip = itineraries.teaserOf(itineraryId).orElseThrow(UnknownJoinTokenException::new);

        if (workspaces.isMember(itineraryId, travelerId)) {
            throw new AlreadyMemberException();
        }
        if (isClosed(itineraryId, trip)) {
            throw new LinkClosedException();
        }
        if (!contact.verified()) {
            throw new EmailNotVerifiedException();
        }

        Optional<JoinRequest> standing = pendingRequestOf(link.workspaceId(), travelerId);
        if (standing.isPresent()) {
            return ViewerJoinState.PENDING;
        }

        JoinRequest asked =
                requests.save(JoinRequest.open(link.workspaceId(), travelerId, Instant.now(clock)));
        log.info(
                "Join requested: requestId={} itineraryId={} travelerId={}",
                asked.id(),
                itineraryId,
                travelerId);
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("join_request_created")
                                        .with("requestId", asked.id())
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", travelerId)
                                        .build()));
        return ViewerJoinState.PENDING;
    }


    @Transactional(readOnly = true)
    public List<PendingJoinRequest> queueFor(Membership owner) {
        if (!owner.isOwner()) {
            throw NotTripOwnerException.toReadTheQueue();
        }
        List<JoinRequest> rows =
                requests.findByWorkspaceIdAndStatusOrderByCreatedAtAsc(
                        workspaceIdOf(owner.itineraryId()), JoinRequestStatus.PENDING);
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, TravelerSummary> profiles =
                travelers.summariesByIds(rows.stream().map(JoinRequest::travelerId).toList()).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, summary -> summary));
        return rows.stream().map(row -> pendingOf(row, profiles.get(row.travelerId()))).toList();
    }


    private static PendingJoinRequest pendingOf(JoinRequest row, TravelerSummary profile) {
        return new PendingJoinRequest(
                row.id(),
                row.travelerId(),
                profile == null ? "" : profile.displayName(),
                profile == null ? null : profile.handle(),
                profile == null ? null : profile.avatarUrl(),
                row.createdAt());
    }


    @Transactional(readOnly = true)
    public List<MyJoinRequest> askedByMe(UUID travelerId) {
        List<JoinRequest> rows =
                requests.findByTravelerIdAndStatusOrderByCreatedAtDesc(
                        travelerId, JoinRequestStatus.PENDING);
        return rows.stream().map(this::myRequestOf).flatMap(Optional::stream).toList();
    }


    private Optional<MyJoinRequest> myRequestOf(JoinRequest row) {
        UUID itineraryId = itineraryIdOf(row.workspaceId());
        Optional<TripTeaser> trip = itineraries.teaserOf(itineraryId);
        if (trip.isEmpty()) {
            return Optional.empty();
        }
        List<MembershipView> roster = workspaces.membersOf(itineraryId);
        return Optional.of(
                new MyJoinRequest(
                        row.id(),
                        itineraryId,
                        trip.get().title(),
                        trip.get().destination(),
                        trip.get().startDate(),
                        trip.get().endDate(),
                        trip.get().coverImageUrl() != null,
                        goingPreviewOf(roster),
                        roster.size(),
                        row.createdAt()));
    }


    private List<MyJoinRequest.GoingTraveler> goingPreviewOf(List<MembershipView> roster) {
        List<UUID> shown =
                roster.stream().map(MembershipView::travelerId).limit(GOING_PREVIEW_SIZE).toList();
        Map<UUID, TravelerSummary> profiles =
                travelers.summariesByIds(shown).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, summary -> summary));
        return shown.stream()
                .map(profiles::get)
                .filter(Objects::nonNull)
                .map(p -> new MyJoinRequest.GoingTraveler(p.id(), p.displayName(), p.avatarUrl()))
                .toList();
    }


    @Transactional
    public void withdraw(UUID travelerId, UUID requestId) {
        JoinRequest mine = requests.findById(requestId).orElseThrow(JoinRequestNotFoundException::new);
        if (!mine.travelerId().equals(travelerId)) {
            throw new JoinRequestNotFoundException();
        }
        if (mine.status() != JoinRequestStatus.PENDING) {
            throw new JoinRequestNotPendingException();
        }

        mine.withdraw(Instant.now(clock));
        requests.saveAndFlush(mine);

        UUID itineraryId = itineraryIdOf(mine.workspaceId());
        log.info(
                "Join request withdrawn: requestId={} itineraryId={} travelerId={}",
                requestId,
                itineraryId,
                travelerId);
        emitDecision("join_request_withdrawn", requestId, itineraryId, travelerId, travelerId);
    }


    @Transactional(readOnly = true)
    public UUID itineraryOfMyRequest(UUID travelerId, UUID requestId) {
        JoinRequest mine = requests.findById(requestId).orElseThrow(JoinRequestNotFoundException::new);
        if (!mine.travelerId().equals(travelerId) || mine.status() != JoinRequestStatus.PENDING) {
            throw new JoinRequestNotFoundException();
        }
        return itineraryIdOf(mine.workspaceId());
    }


    @Transactional
    public void approve(Membership owner, UUID requestId) {
        JoinRequest asked = answerable(owner, requestId);
        UUID itineraryId = owner.itineraryId();
        Instant now = Instant.now(clock);

        workspaces.admitMember(itineraryId, asked.travelerId(), now);
        asked.approve(owner.travelerId(), now);
        requests.saveAndFlush(asked);
        invitations.supersedePendingInvitationsFor(asked.workspaceId(), asked.travelerId());

        log.info(
                "Join request approved: requestId={} itineraryId={} travelerId={} by={}",
                requestId,
                itineraryId,
                asked.travelerId(),
                owner.travelerId());
        emitDecision("join_request_approved", requestId, itineraryId, asked.travelerId(), owner.travelerId());
    }


    @Transactional
    public void decline(Membership owner, UUID requestId) {
        JoinRequest asked = answerable(owner, requestId);
        asked.decline(owner.travelerId(), Instant.now(clock));
        requests.saveAndFlush(asked);

        log.info(
                "Join request declined: requestId={} itineraryId={} by={}",
                requestId,
                owner.itineraryId(),
                owner.travelerId());
        emitDecision(
                "join_request_declined", requestId, owner.itineraryId(), asked.travelerId(), owner.travelerId());
    }


    private JoinRequest answerable(Membership owner, UUID requestId) {
        fence.requireMembershipMutable(owner);
        if (!owner.isOwner()) {
            throw NotTripOwnerException.toAnswerARequest();
        }
        JoinRequest asked = requests.findById(requestId).orElseThrow(JoinRequestNotFoundException::new);
        if (!asked.workspaceId().equals(workspaceIdOf(owner.itineraryId()))) {
            throw new JoinRequestNotFoundException();
        }
        if (asked.status() != JoinRequestStatus.PENDING) {
            throw new JoinRequestNotPendingException();
        }
        return asked;
    }


    @Transactional
    public void supersedeOpenRequest(UUID workspaceId, UUID travelerId) {
        pendingRequestOf(workspaceId, travelerId)
                .ifPresent(
                        open -> {
                            open.supersede(Instant.now(clock));
                            requests.saveAndFlush(open);
                            log.info(
                                    "Join request superseded by the other consent direction: requestId={} travelerId={}",
                                    open.id(),
                                    travelerId);
                        });
    }


    private Optional<JoinRequest> pendingRequestOf(UUID workspaceId, UUID travelerId) {
        return requests.findByWorkspaceIdAndTravelerIdAndStatus(
                workspaceId, travelerId, JoinRequestStatus.PENDING);
    }


    private void emitTeaserViewed(UUID itineraryId, boolean authenticated, ViewerJoinState state) {
        analytics.emit(
                AnalyticsEvent.named("join_teaser_viewed")
                        .with("itineraryId", itineraryId)
                        .with("authenticated", authenticated)
                        .with("viewerState", state.wireName())
                        .build());
    }


    private void emitDecision(
            String event, UUID requestId, UUID itineraryId, UUID travelerId, UUID byTravelerId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("requestId", requestId)
                                        .with("itineraryId", itineraryId)
                                        .with("travelerId", travelerId)
                                        .with("byTravelerId", byTravelerId)
                                        .build()));
    }


    private UUID workspaceIdOf(UUID itineraryId) {
        return workspaces
                .workspaceIdOf(itineraryId)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "No workspace for itinerary " + itineraryId + " — invariant breach"));
    }


    private UUID itineraryIdOf(UUID workspaceId) {
        UUID itineraryId = workspaces.itineraryIdsByWorkspace(List.of(workspaceId)).get(workspaceId);
        if (itineraryId == null) {
            throw new UnknownJoinTokenException();
        }
        return itineraryId;
    }


    private static String prefixOf(String token) {
        return token.substring(0, Math.min(TOKEN_LOG_PREFIX, token.length()));
    }
}
