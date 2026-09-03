package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;


class PinTest {

    private static final BigDecimal BIG_LAGOON_LAT = new BigDecimal("11.1949");

    private static final BigDecimal BIG_LAGOON_LNG = new BigDecimal("119.4013");

    @Test
    void aPinIsAPointAtTheZoomItWasDroppedAt() {
        Pin pin = new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, 15);

        assertThat(pin.latitude()).isEqualByComparingTo("11.1949");
        assertThat(pin.longitude()).isEqualByComparingTo("119.4013");
        assertThat(pin.zoom()).isEqualTo(15);
    }


    @Test
    void aStoredPinCarriesTheScaleTheColumnHolds_soAReadBackComparesEqual() {
        Pin pin = new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, 15);

        assertThat(pin.latitude().scale()).isEqualTo(Pin.STORED_SCALE);
        assertThat(pin).isEqualTo(new Pin(new BigDecimal("11.194900"), new BigDecimal("119.401300"), 15));
    }


    @ParameterizedTest
    @CsvSource({"90.1, 0", "-90.1, 0", "0, 180.1", "0, -180.1"})
    void aPointOffTheEarthIsRefused(String lat, String lng) {
        assertThatThrownBy(() -> new Pin(new BigDecimal(lat), new BigDecimal(lng), 12))
                .isInstanceOf(IllegalArgumentException.class);
    }


    @ParameterizedTest
    @CsvSource({"90, 0", "-90, 0", "0, 180", "0, -180"})
    void theEdgesOfTheWorldAreReachable(String lat, String lng) {
        assertThat(new Pin(new BigDecimal(lat), new BigDecimal(lng), 12)).isNotNull();
    }


    @ParameterizedTest
    @ValueSource(ints = {1, 0, -1, 20, 25})
    void aZoomTheProviderDoesNotServeIsRefused(int zoom) {
        assertThatThrownBy(() -> new Pin(BIG_LAGOON_LAT, BIG_LAGOON_LNG, zoom))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("zoom");
    }


    @Test
    void halfAPinIsNotAPin() {
        assertThatThrownBy(() -> new Pin(null, BIG_LAGOON_LNG, 12))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Pin(BIG_LAGOON_LAT, null, 12))
                .isInstanceOf(IllegalArgumentException.class);
    }


    @Test
    void readingBackAColumnTripletThatIsAllNullYieldsNoPinRatherThanThrowing() {
        assertThat(Pin.readFrom(null, null, null)).isNull();
    }


    @Test
    void readingBackAPartialTripletYieldsNoPin_becauseTheSchemaForbidsWritingOne() {
        assertThat(Pin.readFrom(BIG_LAGOON_LAT, null, (short) 12)).isNull();
        assertThat(Pin.readFrom(null, BIG_LAGOON_LNG, (short) 12)).isNull();
        assertThat(Pin.readFrom(BIG_LAGOON_LAT, BIG_LAGOON_LNG, null)).isNull();
    }


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
