package com.largata.poll;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class PollVoteRaceIT extends PostgresTestBase {

    @Autowired private PollService polls;
    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void twoSimultaneousFirstVotesFromOneMemberLeaveExactlyOneRow() throws Exception {
        Membership owner = ownerOfAFreshTrip();
        PollView asked =
                polls.ask(
                        owner,
                        "Dinner?",
                        List.of("Ramen", "Tacos"),
                        Instant.now().plus(Duration.ofDays(1)));
        UUID ramen = asked.options().getFirst().id();
        UUID tacos = asked.options().get(1).id();

        int outcomes = bothAtOnce(() -> voteQuietly(owner, asked.id(), ramen), () -> voteQuietly(owner, asked.id(), tacos));

        assertThat(votesOn(asked.id()))
                .as(
                        "INV-10 is the unique index, not service courtesy: a check-then-insert would let "
                                + "both of these pass the check and mint two rows")
                .isEqualTo(1);
        assertThat(outcomes).as("at least one of the two submissions succeeded").isPositive();
    }


    @Test
    void aSecondVoteAfterTheFirstMovesItRatherThanAddingOne() {
        Membership owner = ownerOfAFreshTrip();
        PollView asked =
                polls.ask(
                        owner,
                        "Dinner?",
                        List.of("Ramen", "Tacos"),
                        Instant.now().plus(Duration.ofDays(1)));

        polls.vote(owner, asked.id(), asked.options().getFirst().id());
        PollView moved = polls.vote(owner, asked.id(), asked.options().get(1).id());

        assertThat(votesOn(asked.id())).isEqualTo(1);
        assertThat(moved.myVoteOptionId()).isEqualTo(asked.options().get(1).id());
        assertThat(moved.votedCount()).isEqualTo(1);
    }


    private int bothAtOnce(Callable<Integer> first, Callable<Integer> second) throws Exception {
        CyclicBarrier lineUp = new CyclicBarrier(2);
        try (ExecutorService pair = Executors.newFixedThreadPool(2)) {
            Future<Integer> left = pair.submit(startTogether(lineUp, first));
            Future<Integer> right = pair.submit(startTogether(lineUp, second));
            return left.get() + right.get();
        }
    }


    private static Callable<Integer> startTogether(CyclicBarrier lineUp, Callable<Integer> work) {
        return () -> {
            lineUp.await();
            return work.call();
        };
    }


    private int voteQuietly(Membership member, UUID pollId, UUID optionId) {
        try {
            polls.vote(member, pollId, optionId);
            return 1;
        } catch (RuntimeException lostTheRace) {
            return 0;
        }
    }


    private long votesOn(UUID pollId) {
        Long count =
                jdbc.queryForObject("SELECT COUNT(*) FROM poll_vote WHERE poll_id = ?", Long.class, pollId);
        return count == null ? 0L : count;
    }


    private Membership ownerOfAFreshTrip() {
        UUID ownerId = UUID.randomUUID();
        Itinerary trip = itineraries.create(ownerId, "Trip", "Palawan", null, null);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }
}
