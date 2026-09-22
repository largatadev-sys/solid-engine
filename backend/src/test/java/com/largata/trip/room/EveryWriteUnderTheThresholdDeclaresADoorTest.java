package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.RoutesUnderTheThreshold;
import com.largata.support.RoutesUnderTheThreshold.Handler;
import java.util.List;
import org.junit.jupiter.api.Test;


class EveryWriteUnderTheThresholdDeclaresADoorTest {

    @Test
    void everyWriteOnARouteThatNamesATripDeclaresWhichRuleItPassesThrough() {
        List<Handler> writes =
                RoutesUnderTheThreshold.underTheScope().stream().filter(h -> !h.isARead()).toList();

        List<String> undeclared =
                writes.stream()
                        .filter(h -> !h.method().isAnnotationPresent(Door.class))
                        .filter(h -> !h.method().isAnnotationPresent(PublicFace.class))
                        .map(Handler::name)
                        .toList();

        assertThat(undeclared)
                .as(
                        "a write under the threshold is refused at runtime without a door, and this is the"
                                + " build-time half of that promise: the act names OPEN, EDITABLE or"
                                + " MEMBERSHIP_MUTABLE where the act is, so which writes survive publication"
                                + " is a greppable fact and a forgotten door never ships")
                .isEmpty();
    }


    @Test
    void theScanReachesTheWritesItIsSupposedToGuard() {
        List<Handler> writes =
                RoutesUnderTheThreshold.underTheScope().stream().filter(h -> !h.isARead()).toList();

        assertThat(writes)
                .as(
                        "an empty undeclared list proves nothing if the scan matched nothing — the two"
                                + " outcomes are indistinguishable. Trip alone declares thirty writes;"
                                + " a scan seeing fewer than forty across the modules has lost a controller")
                .hasSizeGreaterThanOrEqualTo(40);
        assertThat(writes.stream().map(Handler::name))
                .contains(
                        "TripController#archive",
                        "DayController#append",
                        "PollController#ask",
                        "ChatController#send",
                        "TripInvitationController#invite",
                        "TripJoinController#approve",
                        "ItineraryController#publish",
                        "TripDayPostcardController#post");
    }
}
