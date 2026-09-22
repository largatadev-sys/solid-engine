package com.largata.trip.room;

import static com.largata.support.Fences.fence;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.support.Fences;
import com.largata.trip.exception.ItineraryNotFoundException;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import java.util.UUID;
import org.junit.jupiter.api.Test;


class TripFenceTest {

    private static final UUID TRIP = UUID.randomUUID();


    @Test
    void anOpenRoomAndAnUnpublishedPlanRefuseNothing() {
        TripFence fence = fence(false, false);

        assertThatCode(() -> fence.requireOpenRoom(TRIP)).doesNotThrowAnyException();
        assertThatCode(() -> fence.requireOpenRoom(TRIP, IllegalStateException::new)).doesNotThrowAnyException();
        assertThatCode(() -> fence.requireUnfrozen(TRIP, ItineraryPublishedException::new)).doesNotThrowAnyException();
    }


    @Test
    void aClosedRoomIsNotFound_andThatIsTheOnlyAnswerTheFenceHasForItByDefault() {
        assertThatThrownBy(() -> fence(true, false).requireOpenRoom(TRIP))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void aSurfaceMayNameItsOwnRefusalForAClosedRoom() {
        assertThatThrownBy(() -> fence(true, false).requireOpenRoom(TRIP, LinkClosedForTest::new))
                .isInstanceOf(LinkClosedForTest.class);
    }


    @Test
    void theFreezeAlwaysAnswersWithTheRefusalTheSurfaceNames() {
        assertThatThrownBy(() -> fence(false, true).requireUnfrozen(TRIP, ItineraryPublishedException::new))
                .isInstanceOf(ItineraryPublishedException.class);
        assertThatThrownBy(() -> fence(false, true).requireUnfrozen(TRIP, MembershipFrozenException::new))
                .isInstanceOf(MembershipFrozenException.class);
    }


    @Test
    void theTwoRulesAreIndependent_aClosedRoomStillAnswersTheFreezeQuestionHonestly() {
        assertThatCode(() -> fence(true, false).requireUnfrozen(TRIP, ItineraryPublishedException::new))
                .doesNotThrowAnyException();
        assertThatCode(() -> fence(false, true).requireOpenRoom(TRIP)).doesNotThrowAnyException();
    }


    @Test
    void theRefusalIsNotConsultedWhenTheRuleOpens() {
        TripFence fence = fence(false, false);

        assertThatCode(() -> fence.requireOpenRoom(TRIP, () -> { throw new AssertionError("consulted"); }))
                .doesNotThrowAnyException();
        assertThatCode(() -> fence.requireUnfrozen(TRIP, () -> { throw new AssertionError("consulted"); }))
                .doesNotThrowAnyException();
    }


    @Test
    void anActNamesTheTripAndItsRefusal() {
        TripFence fence = fence(false, false);

        assertThatThrownBy(() -> fence.requireOpenRoom(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> fence.requireOpenRoom(TRIP, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> fence.requireUnfrozen(null, ItineraryPublishedException::new))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> fence.requireUnfrozen(TRIP, null)).isInstanceOf(IllegalArgumentException.class);
    }


    @Test
    void aFenceNeedsBothItsFacts() {
        assertThatThrownBy(() -> new TripFence(null, Fences.publication(false)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TripFence(tripId -> false, null))
                .isInstanceOf(IllegalArgumentException.class);
    }


    private static final class LinkClosedForTest extends RuntimeException {}
}
