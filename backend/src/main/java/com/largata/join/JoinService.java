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
import com.largata.itinerary.TripTeaser;
import com.largata.join.JoinExceptions.AlreadyMemberException;
import com.largata.join.JoinExceptions.EmailNotVerifiedException;
import com.largata.join.JoinExceptions.JoinRequestNotFoundException;
import com.largata.join.JoinExceptions.JoinRequestNotPendingException;
import com.largata.join.JoinExceptions.LinkClosedException;
import com.largata.join.JoinExceptions.NotTripOwnerException;
import com.largata.join.JoinExceptions.UnknownJoinTokenException;
import com.largata.workspace.WorkspaceService;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
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

    private static final int TOKEN_BYTES = 32;

    private static final int TOKEN_LOG_PREFIX = 8;

    private final JoinLinkRepository links;
    private final JoinRequestRepository requests;
    private final WorkspaceService workspaces;
    private final ItineraryService itineraries;
    private final TravelerService travelers;
    private final InvitationService invitations;
    private final WriteFence fence;
    private final Analytics analytics;
    private final Clock clock;
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
        this.webBaseUrl = webBaseUrl;
    }


    @Transactional
    public JoinLinkView linkFor(Membership member) {
        fence.requireMembershipMutable(member);
        UUID workspaceId = workspaceIdOf(member.itineraryId());
        JoinLink link = links.findByWorkspaceId(workspaceId).orElseGet(() -> mint(workspaceId));
        return new JoinLinkView(link.token(), shareUrlOf(link.token()));
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


    private String shareUrlOf(String token) {
        String base = webBaseUrl.endsWith("/") ? webBaseUrl.substring(0, webBaseUrl.length() - 1) : webBaseUrl;
        return base + "/join/" + token;
    }


    @Transactional(readOnly = true)
    public JoinTeaser teaserFor(String token, Optional<UUID> viewerId) {
        JoinLink link = links.findByToken(token).orElseThrow(UnknownJoinTokenException::new);
        UUID itineraryId = itineraryIdOf(link.workspaceId());
        TripTeaser trip = itineraries.teaserOf(itineraryId).orElseThrow(UnknownJoinTokenException::new);

        ViewerJoinState state = viewerStateOf(link, itineraryId, trip, viewerId);
        emitTeaserViewed(itineraryId, viewerId.isPresent(), state);
        return new JoinTeaser(
                itineraryId,
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate(),
                workspaces.membersOf(itineraryId).size(),
                trip.coverImageUrl(),
                state);
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
