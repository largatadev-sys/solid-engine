package com.largata.poll;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.InAudience;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.poll.PollExceptions.DeadlineNotInFutureException;
import com.largata.poll.PollExceptions.NotThePollsAuthorException;
import com.largata.poll.PollExceptions.PollClosedException;
import com.largata.poll.PollExceptions.PollNotFoundException;
import com.largata.poll.PollExceptions.PollOptionNotFoundException;
import com.largata.poll.PollExceptions.TooManyOpenPollsException;
import com.largata.workspace.MembershipView;
import com.largata.workspace.WorkspaceService;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PollService {

    static final int MAX_OPEN_POLLS = 25;

    private final PollRepository polls;
    private final PollVoteRepository votes;
    private final PollVoteInserter inserter;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final WriteFence writeFence;
    private final Analytics analytics;
    private final Clock clock;

    PollService(
            PollRepository polls,
            PollVoteRepository votes,
            PollVoteInserter inserter,
            WorkspaceService workspaces,
            TravelerService travelers,
            WriteFence writeFence,
            Analytics analytics,
            Clock clock) {
        this.polls = polls;
        this.votes = votes;
        this.inserter = inserter;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.writeFence = writeFence;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public PollView ask(Membership member, String question, List<String> optionLabels, Instant closesAt) {
        writeFence.requireWritable(member);
        Instant now = Instant.now(clock);
        if (closesAt == null || !closesAt.isAfter(now)) {
            throw new DeadlineNotInFutureException();
        }
        UUID workspaceId = workspaceIdOf(member);
        if (polls.countOpenIn(workspaceId, now) >= MAX_OPEN_POLLS) {
            throw new TooManyOpenPollsException(MAX_OPEN_POLLS);
        }

        Poll asked =
                polls.save(Poll.asked(workspaceId, member.travelerId(), question, optionLabels, closesAt, now));
        emit(member, "poll_created", asked.id());
        return viewOf(asked, List.of(), rosterOf(member), member.travelerId(), now);
    }


    @Transactional(readOnly = true)
    public PollBoard board(InAudience audience) {
        Membership member = audience.member();
        Instant now = Instant.now(clock);
        UUID workspaceId = workspaceIdOf(member);
        List<Poll> board = polls.boardOf(workspaceId);
        Map<UUID, List<PollVote>> votesByPoll = votesOf(board);
        Map<UUID, PollVoterSummary> roster = rosterOf(member);

        List<PollView> views =
                board.stream()
                        .map(
                                poll ->
                                        viewOf(
                                                poll,
                                                votesByPoll.getOrDefault(poll.id(), List.of()),
                                                roster,
                                                member.travelerId(),
                                                now))
                        .toList();

        List<PollView> active = views.stream().filter(view -> !view.closed()).toList();
        List<PollView> completed =
                views.stream()
                        .filter(PollView::closed)
                        .sorted(Comparator.comparing(PollService::closedOrder).reversed())
                        .toList();
        return new PollBoard(active, completed, roster.size());
    }


    @Transactional
    public PollView vote(Membership member, UUID pollId, UUID optionId) {
        writeFence.requireWritable(member);
        Instant now = Instant.now(clock);
        UUID workspaceId = workspaceIdOf(member);
        Poll poll = pollOf(workspaceId, pollId);
        if (poll.isClosedAt(now)) {
            throw new PollClosedException();
        }
        if (poll.options().stream().noneMatch(option -> option.id().equals(optionId))) {
            throw new PollOptionNotFoundException();
        }

        castOrMove(poll, workspaceId, member.travelerId(), optionId, now);
        emit(member, "poll_voted", pollId);
        return refreshed(member, poll, now);
    }


    @Transactional
    public PollView close(Membership member, UUID pollId) {
        writeFence.requireWritable(member);
        Instant now = Instant.now(clock);
        UUID workspaceId = workspaceIdOf(member);
        Poll poll = pollOf(workspaceId, pollId);
        requireAuthorOrOwner(member, poll);
        if (poll.isClosedAt(now)) {
            throw new PollClosedException();
        }

        poll.closeEarly(member.travelerId(), now);
        polls.saveAndFlush(poll);
        emit(member, "poll_closed", pollId);
        return refreshed(member, poll, now);
    }


    @Transactional
    public void delete(Membership member, UUID pollId) {
        writeFence.requireWritable(member);
        UUID workspaceId = workspaceIdOf(member);
        Poll poll = pollOf(workspaceId, pollId);
        requireAuthorOrOwner(member, poll);

        polls.delete(poll);
        emit(member, "poll_deleted", pollId);
    }


    private void castOrMove(Poll poll, UUID workspaceId, UUID travelerId, UUID optionId, Instant now) {
        if (inserter.moveExisting(poll.id(), workspaceId, travelerId, optionId, now)) {
            return;
        }
        try {
            inserter.insert(poll.id(), optionId, workspaceId, travelerId, now);
        } catch (DataIntegrityViolationException lostTheRace) {
            inserter.moveExisting(poll.id(), workspaceId, travelerId, optionId, now);
        }
    }


    private PollView refreshed(Membership member, Poll poll, Instant now) {
        return viewOf(poll, votes.ofPolls(List.of(poll.id())), rosterOf(member), member.travelerId(), now);
    }


    private void requireAuthorOrOwner(Membership member, Poll poll) {
        if (!member.isOwner() && !poll.isAskedBy(member.travelerId())) {
            throw new NotThePollsAuthorException();
        }
    }


    private Poll pollOf(UUID workspaceId, UUID pollId) {
        return polls.findByIdAndWorkspaceId(pollId, workspaceId).orElseThrow(PollNotFoundException::new);
    }


    private UUID workspaceIdOf(Membership member) {
        return workspaces.workspaceIdOf(member.itineraryId()).orElseThrow(PollNotFoundException::new);
    }


    private Map<UUID, List<PollVote>> votesOf(List<Poll> board) {
        if (board.isEmpty()) {
            return Map.of();
        }
        return votes.ofPolls(board.stream().map(Poll::id).toList()).stream()
                .collect(Collectors.groupingBy(PollVote::pollId));
    }


    private Map<UUID, PollVoterSummary> rosterOf(Membership member) {
        List<MembershipView> rows = workspaces.membersOf(member.itineraryId());
        Map<UUID, TravelerSummary> profiles =
                travelers.summariesByIds(rows.stream().map(MembershipView::travelerId).toList()).stream()
                        .collect(Collectors.toMap(TravelerSummary::id, Function.identity()));
        Map<UUID, PollVoterSummary> roster = new LinkedHashMap<>();
        for (MembershipView row : rows) {
            TravelerSummary profile = profiles.get(row.travelerId());
            roster.put(
                    row.travelerId(),
                    new PollVoterSummary(
                            row.travelerId(),
                            profile == null ? "" : profile.displayName(),
                            profile == null ? null : profile.avatarUrl(),
                            profile == null ? null : profile.handle()));
        }
        return roster;
    }


    private static PollView viewOf(
            Poll poll,
            List<PollVote> pollVotes,
            Map<UUID, PollVoterSummary> roster,
            UUID viewerTravelerId,
            Instant now) {
        List<UUID> optionIds = poll.options().stream().map(PollOption::id).toList();
        Map<UUID, List<PollVoterSummary>> votersByOption = votersByOption(pollVotes, roster);
        Map<UUID, Long> countsByOption =
                optionIds.stream()
                        .collect(
                                Collectors.toMap(
                                        Function.identity(),
                                        id -> (long) votersByOption.getOrDefault(id, List.of()).size()));

        List<PollOptionView> options =
                poll.options().stream()
                        .map(
                                option ->
                                        new PollOptionView(
                                                option.id(),
                                                option.label(),
                                                (int) PollTally.countFor(countsByOption, option.id()),
                                                votersByOption.getOrDefault(option.id(), List.of())))
                        .toList();

        boolean closed = poll.isClosedAt(now);
        UUID myVote =
                pollVotes.stream()
                        .filter(vote -> vote.travelerId().equals(viewerTravelerId))
                        .map(PollVote::optionId)
                        .findFirst()
                        .orElse(null);

        return new PollView(
                poll.id(),
                poll.question(),
                poll.createdBy(),
                poll.closesAt(),
                poll.closedAt(),
                poll.createdAt(),
                closed,
                options,
                closed ? PollTally.winnersAmong(optionIds, countsByOption) : List.of(),
                myVote,
                options.stream().mapToInt(PollOptionView::voteCount).sum(),
                roster.size(),
                poll.isAskedBy(viewerTravelerId));
    }


    private static Map<UUID, List<PollVoterSummary>> votersByOption(
            List<PollVote> pollVotes, Map<UUID, PollVoterSummary> roster) {
        Map<UUID, List<PollVoterSummary>> byOption = new LinkedHashMap<>();
        for (PollVote vote : pollVotes) {
            PollVoterSummary voter = roster.get(vote.travelerId());
            if (voter == null) {
                continue;
            }
            byOption.computeIfAbsent(vote.optionId(), id -> new ArrayList<>()).add(voter);
        }
        return byOption;
    }


    private static Instant closedOrder(PollView view) {
        return view.closedAt() == null ? view.closesAt() : view.closedAt();
    }


    private void emit(Membership member, String event, UUID pollId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("pollId", pollId)
                                        .with("itineraryId", member.itineraryId())
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }
}
