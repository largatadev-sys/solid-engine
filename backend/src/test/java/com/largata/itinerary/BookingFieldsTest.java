package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;


class BookingFieldsTest {

    @Test
    void anActivityCarriesNoBookingUntilOneIsRecorded() {
        ActivityFields fields = activity().build();

        assertThat(fields.externalUrl()).isNull();
        assertThat(fields.bookingPurpose()).isNull();
        assertThat(fields.bookingProvider()).isNull();
        assertThat(fields.bookingPriceAmount()).isNull();
        assertThat(fields.bookingPriceCurrency()).isNull();
    }


    @Test
    void theWholeCardRoundTripsAsTheTravelerEnteredIt() {
        ActivityFields fields =
                activity()
                        .url("https://klook.com/activity/1243-el-nido-underground")
                        .purpose("River tour")
                        .provider("Klook")
                        .price("1800", "PHP")
                        .build();

        assertThat(fields.externalUrl()).isEqualTo("https://klook.com/activity/1243-el-nido-underground");
        assertThat(fields.bookingPurpose()).isEqualTo("River tour");
        assertThat(fields.bookingProvider()).isEqualTo("Klook");
        assertThat(fields.bookingPriceAmount()).isEqualByComparingTo("1800");
        assertThat(fields.bookingPriceCurrency()).isEqualTo("PHP");
    }


    @Test
    void blanksBecomeNullSoAnEmptiedCardLeavesNoGhost() {
        ActivityFields fields = activity().url("  ").purpose("").provider("   ").build();

        assertThat(fields.externalUrl()).isNull();
        assertThat(fields.bookingPurpose()).isNull();
        assertThat(fields.bookingProvider()).isNull();
    }


    @Test
    void aBookingPriceNeedsBothHalvesOrNeither() {
        assertThatThrownBy(() -> activity().priceAmountOnly("1800").build())
                .as("an amount with no currency is a number nobody can read")
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> activity().priceCurrencyOnly("PHP").build())
                .isInstanceOf(IllegalArgumentException.class);
    }


    @Test
    void aBookingPriceCannotBeNegative() {
        assertThatThrownBy(() -> activity().price("-1", "PHP").build())
                .isInstanceOf(IllegalArgumentException.class);
    }


    @Test
    void theBookingPriceIsIndependentOfTheActivitysEstimatedCost() {
        ActivityFields fields =
                new ActivityFields(
                        "Underground River",
                        null,
                        new BigDecimal("500"),
                        "PHP",
                        null,
                        null,
                        null,
                        "https://klook.com/x",
                        "River tour",
                        "Klook",
                        new BigDecimal("1800"),
                        "PHP");

        assertThat(fields.costAmount())
                .as("the founder's recorded call: these are two numbers, and neither derives from the other")
                .isEqualByComparingTo("500");
        assertThat(fields.bookingPriceAmount()).isEqualByComparingTo("1800");
    }


    @Test
    void theBookingFieldsAreBoundedLikeEveryOtherShortText() {
        assertThatThrownBy(() -> activity().purpose("x".repeat(501)).build())
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> activity().provider("x".repeat(501)).build())
                .isInstanceOf(IllegalArgumentException.class);
    }


    private static Builder activity() {
        return new Builder();
    }

    private static final class Builder {
        private String url;
        private String purpose;
        private String provider;
        private BigDecimal priceAmount;
        private String priceCurrency;

        Builder url(String value) {
            this.url = value;
            return this;
        }

        Builder purpose(String value) {
            this.purpose = value;
            return this;
        }

        Builder provider(String value) {
            this.provider = value;
            return this;
        }

        Builder price(String amount, String currency) {
            this.priceAmount = new BigDecimal(amount);
            this.priceCurrency = currency;
            return this;
        }

        Builder priceAmountOnly(String amount) {
            this.priceAmount = new BigDecimal(amount);
            return this;
        }

        Builder priceCurrencyOnly(String currency) {
            this.priceCurrency = currency;
            return this;
        }

        ActivityFields build() {
            return new ActivityFields(
                    "Airport Transfer",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    url,
                    purpose,
                    provider,
                    priceAmount,
                    priceCurrency);
        }
    }
}
