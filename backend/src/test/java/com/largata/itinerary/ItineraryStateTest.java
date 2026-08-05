package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;


class ItineraryStateTest {

    @Test
    void theLadderRunsDraftUpcomingOngoingCompleted() {
        assertThat(ItineraryState.DRAFT.next()).contains(ItineraryState.UPCOMING);
        assertThat(ItineraryState.UPCOMING.next()).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.ONGOING.next()).contains(ItineraryState.COMPLETED);
        assertThat(ItineraryState.COMPLETED.next()).isEmpty();
    }


    @Test
    void theUndoRunsBackDownTheSameLadderOneRungAtATime() {
        assertThat(ItineraryState.COMPLETED.previous()).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.ONGOING.previous()).contains(ItineraryState.UPCOMING);
        assertThat(ItineraryState.UPCOMING.previous()).contains(ItineraryState.DRAFT);
        assertThat(ItineraryState.DRAFT.previous()).isEmpty();
    }


    @Test
    void onlyACompletedTripAdmitsPublishing() {
        assertThat(ItineraryState.DRAFT.admitsPublishing()).isFalse();
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
    void parseAcceptsEveryWireSpellingAndRefusesTheRetiredOne() {
        assertThat(ItineraryState.parse("upcoming")).contains(ItineraryState.UPCOMING);
        assertThat(ItineraryState.parse("ongoing")).contains(ItineraryState.ONGOING);
        assertThat(ItineraryState.parse("draft")).contains(ItineraryState.DRAFT);
        assertThat(ItineraryState.parse("completed")).contains(ItineraryState.COMPLETED);
        assertThat(ItineraryState.parse("active"))
                .as("ADR-020 renamed it — a client still sending the old word must not be silently understood")
                .isEmpty();
        assertThat(ItineraryState.parse(null)).isEqualTo(Optional.empty());
    }
}
