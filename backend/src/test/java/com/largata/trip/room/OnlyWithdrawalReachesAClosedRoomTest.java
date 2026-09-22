package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.RoutesUnderTheThreshold;
import com.largata.support.RoutesUnderTheThreshold.Handler;
import java.lang.annotation.Annotation;
import java.util.List;
import org.junit.jupiter.api.Test;


class OnlyWithdrawalReachesAClosedRoomTest {

    @Test
    void theActsThatReachAClosedRoomAreExactlyTheOnesThatWithdrawTheCallersOwnFootprint() {
        assertThat(handlersCarrying(ReachesClosedRoom.class))
                .as(
                        "Undo, self-leave and the edit-lock release: each takes something of the caller's"
                                + " own back out of a room that is closed to them, and a closed room must never"
                                + " trap what a traveler wants to withdraw (spec user story 8). Anything else"
                                + " reaching a closed room is a leak of the room's existence, so the list is"
                                + " exact and grows only through this test")
                .containsExactlyInAnyOrder(
                        "TripController#unarchive",
                        "TripMembershipController#endMembership",
                        "EditLeaseController#release");
    }


    @Test
    void theTripHasExactlyOnePublicFaceUnderTheRoomsGrammar() {
        assertThat(handlersCarrying(PublicFace.class))
                .as(
                        "the published page addressed by trip id is readable by any traveler and is not the"
                                + " room's; it is the scope's one exception, and a second one is a decision,"
                                + " not a default")
                .containsExactly("ItineraryController#readByTrip");
    }


    private static List<String> handlersCarrying(Class<? extends Annotation> declaration) {
        return RoutesUnderTheThreshold.everyHandler().stream()
                .filter(h -> h.method().isAnnotationPresent(declaration))
                .map(Handler::name)
                .distinct()
                .toList();
    }
}
