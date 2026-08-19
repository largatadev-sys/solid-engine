package com.largata.poll;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;


class PollTallyTest {

    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final UUID C = UUID.randomUUID();


    @Test
    void theOptionWithTheMostVotesWinsAlone() {
        assertThat(PollTally.winnersAmong(List.of(A, B, C), Map.of(A, 3L, B, 2L, C, 0L)))
                .containsExactly(A);
    }


    @Test
    void everyLeaderIsStarredWhenTheyTie() {
        assertThat(PollTally.winnersAmong(List.of(A, B, C), Map.of(A, 3L, B, 3L, C, 1L)))
                .as("no tiebreak rule exists — the star marks the leading options as counted")
                .containsExactly(A, B);
    }


    @Test
    void aPollNobodyVotedOnStarsNothingAtAll() {
        assertThat(PollTally.winnersAmong(List.of(A, B), Map.of()))
                .as("zero votes stars nothing — a leader of zero is not a winner")
                .isEmpty();
    }


    @Test
    void anOptionAbsentFromTheTallyCountsAsZeroRatherThanFailing() {
        assertThat(PollTally.winnersAmong(List.of(A, B), Map.of(A, 1L))).containsExactly(A);
    }


    @Test
    void winnersKeepTheOptionsOwnOrderSoTheStarsReadTopDown() {
        assertThat(PollTally.winnersAmong(List.of(C, A, B), Map.of(A, 2L, B, 2L, C, 2L)))
                .containsExactly(C, A, B);
    }
}
