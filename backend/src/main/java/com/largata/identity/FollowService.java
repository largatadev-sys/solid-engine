package com.largata.identity;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.identity.IdentityExceptions.SelfFollowException;
import com.largata.identity.api.FollowStateResponse;
import com.largata.identity.api.TravelerCardResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class FollowService {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 50;

    private final FollowTopic topic;
    private final FollowRepository follows;
    private final FollowRequestRepository requests;
    private final FollowRequestService asks;
    private final TravelerRepository travelers;
    private final TravelerService summaries;
    private final Analytics analytics;
    private final Clock clock;

    FollowService(
            FollowRepository follows,
            FollowRequestRepository requests,
            FollowRequestService asks,
            TravelerRepository travelers,
            TravelerService summaries,
            Analytics analytics,
            Clock clock,
            FollowTopic topic) {
        this.topic = topic;
        this.follows = follows;
        this.requests = requests;
        this.asks = asks;
        this.travelers = travelers;
        this.summaries = summaries;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public FollowStateResponse follow(UUID followerId, UUID followeeId) {
        Traveler followee = requireOnboarded(followeeId);
        if (followerId.equals(followeeId)) {
            throw new SelfFollowException();
        }

        if (follows.edgeCount(followerId, followeeId) > 0) {
            return FollowStateResponse.following();
        }
        if (!followee.profileVisibility().isOpenToEveryone()) {
            asks.askOrFind(followerId, followeeId);
            return FollowStateResponse.requested();
        }

        int inserted = follows.follow(followerId, followeeId, Instant.now(clock));
        if (inserted > 0) {
            emitAfterCommit("follow_created", followerId, followeeId);
            topic.broadcastFollowersChanged(followeeId);
        }
        return FollowStateResponse.following();
    }


    @Transactional
    public void unfollow(UUID followerId, UUID followeeId) {
        requireOnboarded(followeeId);
        asks.cancel(followerId, followeeId);

        int removed = follows.unfollow(followerId, followeeId);
        if (removed > 0) {
            emitAfterCommit("follow_removed", followerId, followeeId);
            topic.broadcastFollowersChanged(followeeId);
        }
    }


    @Transactional
    public void removeFollower(UUID travelerId, UUID followerId) {
        requireOnboarded(followerId);
        if (travelerId.equals(followerId)) {
            throw new SelfFollowException();
        }
        asks.cancel(followerId, travelerId);

        int removed = follows.unfollow(followerId, travelerId);
        if (removed > 0) {
            emitAfterCommit("follow_removed", followerId, travelerId);
            topic.broadcastFollowersChanged(travelerId);
            AfterCommit.run(
                    () ->
                            analytics.emit(
                                    AnalyticsEvent.named("follower_removed")
                                            .with("travelerId", travelerId)
                                            .with("followerId", followerId)
                                            .build()));
        }
    }


    @Transactional
    public void removeFollower(UUID travelerId, UUID followerId) {
        requireOnboarded(followerId);
        if (travelerId.equals(followerId)) {
            throw new SelfFollowException();
        }
        asks.cancel(followerId, travelerId);

        int removed = follows.unfollow(followerId, travelerId);
        if (removed > 0) {
            emitAfterCommit("follow_removed", followerId, travelerId);
            AfterCommit.run(
                    () ->
                            analytics.emit(
                                    AnalyticsEvent.named("follower_removed")
                                            .with("travelerId", travelerId)
                                            .with("followerId", followerId)
                                            .build()));
        }
    }


    @Transactional(readOnly = true)
    public FollowStanding standingOf(UUID subjectId, UUID viewerId) {
        boolean following = follows.edgeCount(viewerId, subjectId) > 0;
        return new FollowStanding(
                follows.countFollowers(subjectId),
                follows.countFollowing(subjectId),
                following,
                follows.edgeCount(subjectId, viewerId) > 0,
                relationOf(viewerId, subjectId, following));
    }


    private ViewerRelation relationOf(UUID viewerId, UUID subjectId, boolean following) {
        if (following) {
            return ViewerRelation.FOLLOWING;
        }
        return requests.findPending(viewerId, subjectId).isPresent()
                ? ViewerRelation.REQUESTED
                : ViewerRelation.NONE;
    }


    @Transactional(readOnly = true)
    public FollowCounts countsOf(UUID travelerId) {
        return new FollowCounts(
                follows.countFollowers(travelerId), follows.countFollowing(travelerId));
    }


    @Transactional(readOnly = true)
    public Set<UUID> followedAmong(UUID followerId, Collection<UUID> candidates) {
        if (candidates.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(follows.followedAmong(followerId, candidates));
    }


    @Transactional(readOnly = true)
    public List<UUID> followeeIdsOf(UUID followerId) {
        return follows.followeeIdsOf(followerId);
    }


    @Transactional(readOnly = true)
    public Page<TravelerCardResponse> followersOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        return pageOf(
                requestedLimit,
                cursor,
                (limit, from) ->
                        follows.followersPage(
                                subject.id(),
                                from == null ? null : from.at(),
                                from == null ? null : from.id(),
                                limit),
                Follow::followerId);
    }


    @Transactional(readOnly = true)
    public Page<TravelerCardResponse> followingOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        return pageOf(
                requestedLimit,
                cursor,
                (limit, from) ->
                        follows.followingPage(
                                subject.id(),
                                from == null ? null : from.at(),
                                from == null ? null : from.id(),
                                limit),
                Follow::followeeId);
    }


    private Page<TravelerCardResponse> pageOf(
            Integer requestedLimit,
            String cursor,
            EdgePage edges,
            Function<Follow, UUID> otherSide) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<Follow> found = edges.fetch(limit + 1, from);
        boolean more = found.size() > limit;
        List<Follow> rows = more ? found.subList(0, limit) : found;

        List<TravelerCardResponse> cards = cardsOf(rows.stream().map(otherSide).toList());

        if (!more) {
            return Page.exhausted(cards);
        }
        Follow last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.createdAt(), otherSide.apply(last)));
    }


    private List<TravelerCardResponse> cardsOf(List<UUID> travelerIds) {
        if (travelerIds.isEmpty()) {
            return List.of();
        }
        Map<UUID, TravelerCardResponse> byId =
                summaries.summariesByIds(travelerIds).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, TravelerCardResponse::of));
        return travelerIds.stream().map(byId::get).filter(card -> card != null).toList();
    }


    private Traveler requireOnboarded(UUID travelerId) {
        return travelers
                .findById(travelerId)
                .filter(Traveler::onboardingCompleted)
                .orElseThrow(NoSuchHandleException::new);
    }


    @Transactional(readOnly = true)
    public UUID onboardedIdByHandle(String rawHandle) {
        return onboardedByHandle(rawHandle).id();
    }


    private TravelerSummary onboardedByHandle(String rawHandle) {
        return summaries.onboardedByExactHandle(rawHandle).orElseThrow(NoSuchHandleException::new);
    }


    private void emitAfterCommit(String name, UUID followerId, UUID followeeId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(name)
                                        .with("followerId", followerId)
                                        .with("followeeId", followeeId)
                                        .build()));
    }


    private static int clamp(Integer requested) {
        if (requested == null || requested <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requested, MAX_PAGE_SIZE);
    }


    @FunctionalInterface
    private interface EdgePage {
        List<Follow> fetch(int limit, InstantCursor from);
    }
}
