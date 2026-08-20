package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;


class ItineraryStateTest {

    @Test
    void theLadderRunsUpcomingOngoingCompleted() {
        assertThat(ItineraryState.UPCOMING.next()).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.ONGOING.next()).contains(ItineraryState.COMPLETED);
        assertThat(ItineraryState.COMPLETED.next()).isEmpty();
    }


    @Test
    void theUndoRunsBackDownTheSameLadderAndFloorsAtUpcoming() {
        assertThat(ItineraryState.COMPLETED.previous()).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.ONGOING.previous()).contains(ItineraryState.UPCOMING);
        assertThat(ItineraryState.UPCOMING.previous())
                .as("upcoming is the birth state — there is nothing before it to step back to")
                .isEmpty();
    }


    @Test
    void onlyACompletedTripAdmitsPublishing() {
        assertThat(ItineraryState.UPCOMING.admitsPublishing()).isFalse();
        assertThat(ItineraryState.ONGOING.admitsPublishing()).isFalse();
        assertThat(ItineraryState.COMPLETED.admitsPublishing()).isTrue();
    }


    @Test
    void theWireSpellingIsLowerCaseAndTheStorageSpellingIsTheEnumName() {
        assertThat(ItineraryState.UPCOMING.wireName()).isEqualTo("upcoming");
        assertThat(ItineraryState.ONGOING.wireName()).isEqualTo("ongoing");
        assertThat(ItineraryState.UPCOMING.name())
                .as("@Enumerated(STRING) writes the NAME — any SQL naming this value contracts with it")
                .isEqualTo("UPCOMING");
        assertThat(ItineraryState.ONGOING.name()).isEqualTo("ONGOING");
    }


    @Test
    void theLadderHasExactlyThreeRungs() {
        assertThat(ItineraryState.values())
                .containsExactly(
                        ItineraryState.UPCOMING, ItineraryState.ONGOING, ItineraryState.COMPLETED);
    }


    @Test
    void parseAcceptsEveryWireSpellingAndRefusesBothRetiredOnes() {
        assertThat(ItineraryState.parse("upcoming")).contains(ItineraryState.UPCOMING);
        assertThat(ItineraryState.parse("ongoing")).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.parse("completed")).contains(ItineraryState.COMPLETED);
        assertThat(ItineraryState.parse("draft"))
                .as("S4.26 retired the state — a client still sending it must not be silently understood")
                .isEmpty();
        assertThat(ItineraryState.parse("active"))
                .as("ADR-020 renamed it — a client still sending the old word must not be silently understood")
                .isEmpty();
        assertThat(ItineraryState.parse(null)).isEqualTo(Optional.empty());
    }
}
