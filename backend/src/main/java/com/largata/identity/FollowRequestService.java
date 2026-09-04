package com.largata.identity;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.IdentityExceptions.NoSuchFollowRequestException;
import com.largata.identity.api.FollowRequestResponse;
import com.largata.identity.api.TravelerCardResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class FollowRequestService {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 50;

    private final FollowRequestRepository requests;
    private final FollowRepository follows;
    private final TravelerService summaries;
    private final Analytics analytics;
    private final Clock clock;

    FollowRequestService(
            FollowRequestRepository requests,
            FollowRepository follows,
            TravelerService summaries,
            Analytics analytics,
            Clock clock) {
        this.requests = requests;
        this.follows = follows;
        this.summaries = summaries;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public FollowRequest askOrFind(UUID requesterId, UUID targetId) {
        Optional<FollowRequest> standing = requests.findPending(requesterId, targetId);
        if (standing.isPresent()) {
            return standing.get();
        }

        FollowRequest asked;
        try {
            asked = requests.saveAndFlush(FollowRequest.asked(requesterId, targetId, Instant.now(clock)));
        } catch (DataIntegrityViolationException lostTheRace) {
            return requests.findPending(requesterId, targetId).orElseThrow(NoSuchFollowRequestException::new);
        }

        emitAfterCommit("follow_requested", requesterId, targetId);
        return asked;
    }


    @Transactional
    public void cancel(UUID requesterId, UUID targetId) {
        requests.findPending(requesterId, targetId).ifPresent(pending -> pending.cancel(Instant.now(clock)));
    }


    @Transactional
    public void approve(UUID targetId, UUID requesterId) {
        FollowRequest pending =
                requests.findPending(requesterId, targetId).orElseThrow(NoSuchFollowRequestException::new);
        Instant now = Instant.now(clock);

        pending.approve(now);
        grantTheEdge(requesterId, targetId, now);
        emitAfterCommit("follow_request_approved", requesterId, targetId);
    }


    @Transactional
    public void decline(UUID targetId, UUID requesterId) {
        FollowRequest pending =
                requests.findPending(requesterId, targetId).orElseThrow(NoSuchFollowRequestException::new);

        pending.decline(Instant.now(clock));
        emitAfterCommit("follow_request_declined", requesterId, targetId);
    }


    @Transactional
    public void approveEveryPendingFor(UUID targetId) {
        Instant now = Instant.now(clock);

        for (FollowRequest pending : requests.findEveryPendingFor(targetId)) {
            UUID requesterId = pending.requesterId();
            pending.approve(now);
            grantTheEdge(requesterId, targetId, now);
            emitAfterCommit("follow_request_approved", requesterId, targetId);
        }
    }


    @Transactional(readOnly = true)
    public boolean hasPending(UUID requesterId, UUID targetId) {
        return requests.findPending(requesterId, targetId).isPresent();
    }


    @Transactional(readOnly = true)
    public Page<FollowRequestResponse> inboxOf(UUID targetId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<FollowRequest> found =
                requests.inboxPage(
                        targetId,
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<FollowRequest> rows = more ? found.subList(0, limit) : found;
        List<FollowRequestResponse> cards = project(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        FollowRequest last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.requestedAt(), last.id()));
    }


    private List<FollowRequestResponse> project(List<FollowRequest> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, TravelerCardResponse> byId =
                summaries.summariesByIds(rows.stream().map(FollowRequest::requesterId).toList()).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, TravelerCardResponse::of));

        return rows.stream()
                .map(row -> cardOf(row, byId.get(row.requesterId())))
                .filter(card -> card != null)
                .toList();
    }


    private static FollowRequestResponse cardOf(FollowRequest row, TravelerCardResponse requester) {
        return requester == null ? null : new FollowRequestResponse(requester, row.requestedAt());
    }


    private void grantTheEdge(UUID followerId, UUID followeeId, Instant at) {
        if (follows.follow(followerId, followeeId, at) > 0) {
            emitAfterCommit("follow_created", followerId, followeeId);
        }
    }


    private void emitAfterCommit(String name, UUID requesterId, UUID targetId) {
        String followerKey = "follow_created".equals(name) ? "followerId" : "requesterId";
        String followeeKey = "follow_created".equals(name) ? "followeeId" : "targetId";
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(name)
                                        .with(followerKey, requesterId)
                                        .with(followeeKey, targetId)
                                        .build()));
    }


    private static int clamp(Integer requested) {
        if (requested == null || requested <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requested, MAX_PAGE_SIZE);
    }
}
