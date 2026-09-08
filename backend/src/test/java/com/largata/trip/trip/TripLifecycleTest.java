package com.largata.trip.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import com.largata.trip.api.TripLifecycle;


class TripLifecycleTest {

    @Test
    void theLadderRunsUpcomingOngoingCompleted() {
        assertThat(TripLifecycle.UPCOMING.next()).contains(TripLifecycle.ONGOING);
        assertThat(TripLifecycle.ONGOING.next()).contains(TripLifecycle.COMPLETED);
        assertThat(TripLifecycle.COMPLETED.next()).isEmpty();
    }


    @Test
    void theUndoRunsBackDownTheSameLadderAndFloorsAtUpcoming() {
        assertThat(TripLifecycle.COMPLETED.previous()).contains(TripLifecycle.ONGOING);
        assertThat(TripLifecycle.ONGOING.previous()).contains(TripLifecycle.UPCOMING);
        assertThat(TripLifecycle.UPCOMING.previous())
                .as("upcoming is the birth state — there is nothing before it to step back to")
                .isEmpty();
    }


    @Test
    void onlyACompletedTripAdmitsPublishing() {
        assertThat(TripLifecycle.UPCOMING.admitsPublishing()).isFalse();
        assertThat(TripLifecycle.ONGOING.admitsPublishing()).isFalse();
        assertThat(TripLifecycle.COMPLETED.admitsPublishing()).isTrue();
    }


    @Test
    void theWireSpellingIsLowerCaseAndTheStorageSpellingIsTheEnumName() {
        assertThat(TripLifecycle.UPCOMING.wireName()).isEqualTo("upcoming");
        assertThat(TripLifecycle.ONGOING.wireName()).isEqualTo("ongoing");
        assertThat(TripLifecycle.UPCOMING.name())
                .as("@Enumerated(STRING) writes the NAME — any SQL naming this value contracts with it")
                .isEqualTo("UPCOMING");
        assertThat(TripLifecycle.ONGOING.name()).isEqualTo("ONGOING");
    }


    @Test
    void theLadderHasExactlyThreeRungs() {
        assertThat(TripLifecycle.values())
                .containsExactly(
                        TripLifecycle.UPCOMING, TripLifecycle.ONGOING, TripLifecycle.COMPLETED);
    }


    @Test
    void parseAcceptsEveryWireSpellingAndRefusesBothRetiredOnes() {
        assertThat(TripLifecycle.parse("upcoming")).contains(TripLifecycle.UPCOMING);
        assertThat(TripLifecycle.parse("ongoing")).contains(TripLifecycle.ONGOING);
        assertThat(TripLifecycle.parse("completed")).contains(TripLifecycle.COMPLETED);
        assertThat(TripLifecycle.parse("draft"))
                .as("S4.26 retired the state — a client still sending it must not be silently understood")
                .isEmpty();
        assertThat(TripLifecycle.parse("active"))
                .as("ADR-020 renamed it — a client still sending the old word must not be silently understood")
                .isEmpty();
        assertThat(TripLifecycle.parse(null)).isEqualTo(Optional.empty());
    }
}
