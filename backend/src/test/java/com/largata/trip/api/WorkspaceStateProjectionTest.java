package com.largata.trip.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class WorkspaceStateProjectionTest {

    @Test
    void anOpenRoomAnswersCompletedForACompletedTripAndActiveForEveryOther() {
        assertThat(WorkspaceStateProjection.of(TripLifecycle.UPCOMING, false)).isEqualTo("active");
        assertThat(WorkspaceStateProjection.of(TripLifecycle.ONGOING, false)).isEqualTo("active");
        assertThat(WorkspaceStateProjection.of(TripLifecycle.COMPLETED, false))
                .as("the workspace stopped storing this; the lifecycle it was copying still says it")
                .isEqualTo("completed");
    }


    @Test
    void aClosedRoomAnswersArchivedWhateverTheLifecycleSays() {
        assertThat(WorkspaceStateProjection.of(TripLifecycle.UPCOMING, true)).isEqualTo("archived");
        assertThat(WorkspaceStateProjection.of(TripLifecycle.ONGOING, true)).isEqualTo("archived");
        assertThat(WorkspaceStateProjection.of(TripLifecycle.COMPLETED, true))
                .as("archived dominated completed before V58 and still does — the room is the outer fact")
                .isEqualTo("archived");
    }


    @Test
    void theThreeWireValuesAreTheOnesShippedBeforeV58() {
        assertThat(WorkspaceStateProjection.ARCHIVED).isEqualTo("archived");
        assertThat(WorkspaceStateProjection.COMPLETED).isEqualTo("completed");
        assertThat(WorkspaceStateProjection.ACTIVE)
                .as("a client reads these strings; V58 moved where they are computed, never what they are")
                .isEqualTo("active");
    }
}
