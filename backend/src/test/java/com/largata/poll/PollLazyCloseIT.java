package com.largata.poll;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.common.authz.AudienceFence;
import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import com.largata.workspace.WorkspaceService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;


@SpringBootTest
@Import(PollLazyCloseIT.ClockConfig.class)
class PollLazyCloseIT extends PostgresTestBase {

    private static final Instant START = Instant.parse("2026-08-20T10:00:00Z");

    private static final Duration AN_HOUR = Duration.ofHours(1);

    @Autowired private PollService polls;
    @Autowired private MutableClock clock;
    @Autowired private ItineraryService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private AudienceFence audience;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private TransactionTemplate transactions;

    @Test
    void aPollPastItsDeadlineReadsClosedWithoutAnyWriteEverHavingHappened() {
        Membership owner = ownerOfAFreshTrip();
        PollView asked = ask(owner, "Dinner?", List.of("Ramen", "Tacos"));
        polls.vote(owner, asked.id(), asked.options().getFirst().id());
        assertThat(onlyPollOf(owner).closed()).isFalse();

        clock.advance(AN_HOUR.plusSeconds(1));

        PollView afterTheDeadline = onlyPollOf(owner);
        assertThat(afterTheDeadline.closed())
                .as("closed-ness is derived at read time — there is no scheduler and none ships")
                .isTrue();
        assertThat(afterTheDeadline.winningOptionIds())
                .containsExactly(asked.options().getFirst().id());
        assertThat(storedClosedAtOf(asked.id()))
                .as("a deadline close stores nothing at all — only an early close stamps a row")
                .isNull();
    }


    @Test
    void aPollStillInsideItsDeadlineStaysOpenAndStarsNoWinnerYet() {
        Membership owner = ownerOfAFreshTrip();
        PollView asked = ask(owner, "Dinner?", List.of("Ramen", "Tacos"));
        polls.vote(owner, asked.id(), asked.options().getFirst().id());

        clock.advance(AN_HOUR.minusSeconds(1));

        PollView open = onlyPollOf(owner);
        assertThat(open.closed()).isFalse();
        assertThat(open.winningOptionIds())
                .as("an open poll has a leader, not a winner — the star is a closed-poll mark")
                .isEmpty();
    }


    @Test
    void aDeadlinePassedPollRefusesAVoteByNameWithNoWriteHavingClosedIt() {
        Membership owner = ownerOfAFreshTrip();
        PollView asked = ask(owner, "Dinner?", List.of("Ramen", "Tacos"));

        clock.advance(AN_HOUR.plusSeconds(1));

        assertThatExceptionOfType(PollExceptions.PollClosedException.class)
                .isThrownBy(() -> polls.vote(owner, asked.id(), asked.options().getFirst().id()));
        assertThatExceptionOfType(PollExceptions.PollClosedException.class)
                .isThrownBy(() -> polls.close(owner, asked.id()));
    }


    @Test
    void aTieStarsEveryLeaderAndAZeroVoteCloseStarsNothing() {
        Membership owner = ownerOfAFreshTrip();
        UUID second = admitAMember(owner);
        Membership member = new Membership(second, owner.itineraryId(), Role.MEMBER);

        PollView tied = ask(owner, "Tied?", List.of("A", "B"));
        polls.vote(owner, tied.id(), tied.options().getFirst().id());
        polls.vote(member, tied.id(), tied.options().get(1).id());
        PollView untouched = ask(owner, "Nobody cares?", List.of("A", "B"));

        clock.advance(AN_HOUR.plusSeconds(1));

        assertThat(winnersOf(owner, tied.id()))
                .as("no tiebreak rule exists — every leader is starred")
                .containsExactlyInAnyOrderElementsOf(
                        tied.options().stream().map(PollOptionView::id).toList());
        assertThat(winnersOf(owner, untouched.id()))
                .as("a zero-vote close stars nothing at all")
                .isEmpty();
    }


    @Test
    void anEarlyCloseStampsTheRowWhileTheDeadlineIsStillInTheFuture() {
        Membership owner = ownerOfAFreshTrip();
        PollView asked = ask(owner, "Dinner?", List.of("Ramen", "Tacos"));

        PollView closed = polls.close(owner, asked.id());

        assertThat(closed.closed()).isTrue();
        assertThat(closed.closedAt()).isEqualTo(Instant.now(clock));
        assertThat(storedClosedAtOf(asked.id())).isNotNull();
    }


    @Test
    void anOpenPollCapCountsOnlyPollsThatAreStillOpenByTheClock() {
        Membership owner = ownerOfAFreshTrip();
        for (int i = 0; i < PollService.MAX_OPEN_POLLS; i++) {
            ask(owner, "Poll " + i, List.of("A", "B"));
        }

        assertThatExceptionOfType(PollExceptions.TooManyOpenPollsException.class)
                .isThrownBy(() -> ask(owner, "One too many", List.of("A", "B")));

        clock.advance(AN_HOUR.plusSeconds(1));

        assertThat(ask(owner, "Room again, without a single write", List.of("A", "B")).id())
                .as("the cap reads the same derived closed-ness the board does")
                .isNotNull();
    }


    private PollView ask(Membership member, String question, List<String> options) {
        return polls.ask(member, question, options, Instant.now(clock).plus(AN_HOUR));
    }


    private PollView onlyPollOf(Membership member) {
        PollBoard board = polls.board(audience.requireInAudience(member));
        List<PollView> everyPoll =
                java.util.stream.Stream.concat(board.active().stream(), board.completed().stream()).toList();
        assertThat(everyPoll).hasSize(1);
        return everyPoll.getFirst();
    }


    private List<UUID> winnersOf(Membership member, UUID pollId) {
        PollBoard board = polls.board(audience.requireInAudience(member));
        return java.util.stream.Stream.concat(board.active().stream(), board.completed().stream())
                .filter(poll -> poll.id().equals(pollId))
                .findFirst()
                .orElseThrow()
                .winningOptionIds();
    }


    private Instant storedClosedAtOf(UUID pollId) {
        return jdbc.queryForObject("SELECT closed_at FROM poll WHERE id = ?", Instant.class, pollId);
    }


    private Membership ownerOfAFreshTrip() {
        UUID ownerId = UUID.randomUUID();
        Itinerary trip = itineraries.create(ownerId, "Trip", "Palawan", null, null);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }


    private UUID admitAMember(Membership owner) {
        UUID travelerId = UUID.randomUUID();
        transactions.executeWithoutResult(
                status -> workspaces.admitMember(owner.itineraryId(), travelerId, Instant.now(clock)));
        return travelerId;
    }


    @TestConfiguration
    static class ClockConfig {

        @Bean
        @Primary
        MutableClock pollLazyCloseTestClock() {
            return new MutableClock(START);
        }
    }
}
