package com.largata.trip.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.geo.Pin;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import com.largata.trip.plan.ActivityFields;


class ActivityPinTest {

    private static final BigDecimal BIG_LAGOON_LAT = new BigDecimal("11.194900");
    private static final BigDecimal BIG_LAGOON_LNG = new BigDecimal("119.401300");


    @Test
    void aPinnedActivityNeedsAPlaceATravelerCanRead() {
        assertThatThrownBy(
                        () -> UnbookedActivity.pinned("Kayaking", null, new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, 15)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("place");
    }


    @Test
    void aPlaceWithoutAPinIsPerfectlyNormal_becauseTextOnlyIsPermanent() {
        assertThat(UnbookedActivity.pinned("Kayaking", "Big Lagoon", null).pin()).isNull();
    }


    @Test
    void twoActivitiesDescribeTheSamePlanOnlyIfTheirPinsAgree() {
        ActivityFields pinned =
                UnbookedActivity.pinned("Kayaking", "Big Lagoon", new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, 15));
        ActivityFields elsewhere =
                UnbookedActivity.pinned("Kayaking", "Big Lagoon", new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, 12));
        ActivityFields unpinned = UnbookedActivity.pinned("Kayaking", "Big Lagoon", null);

        assertThat(pinned.describesSamePlanAs(pinned)).isTrue();
        assertThat(pinned.describesSamePlanAs(elsewhere))
                .as("the zoom a traveler framed is part of the pin, so moving it is a real edit")
                .isFalse();
        assertThat(pinned.describesSamePlanAs(unpinned)).isFalse();
    }
}
