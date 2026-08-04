package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.id.UuidV7;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;


class EstimatedCostTest {

    @Test
    void aPlanWithNoPricedActivityHasNoTotal() {
        assertThat(EstimatedCost.derivedFrom(List.of())).isEmpty();
        assertThat(EstimatedCost.derivedFrom(List.of(day(activity(null, null))))).isEmpty();
    }


    @Test
    void oneCurrencyAcrossEveryPricedActivitySumsToATotal() {
        EstimatedCost cost =
                EstimatedCost.derivedFrom(
                        List.of(
                                day(activity("500", "PHP"), activity("1200.50", "PHP")),
                                day(activity("300", "PHP"), activity(null, null))))
                        .orElseThrow();

        assertThat(cost.amount()).isEqualByComparingTo("2000.50");
        assertThat(cost.currency()).isEqualTo("PHP");
    }


    @Test
    void twoCurrenciesMeanNoTotalBecauseTheSumWouldLie() {
        assertThat(EstimatedCost.derivedFrom(List.of(day(activity("500", "PHP"), activity("40", "USD"))))).isEmpty();
    }


    @Test
    void aPricedActivityWithNoCurrencyBesideAPricedOneWithOneAlsoMeansNoTotal() {
        assertThat(EstimatedCost.derivedFrom(List.of(day(activity("500", "PHP"), activity("40", null))))).isEmpty();
        assertThat(EstimatedCost.derivedFrom(List.of(day(activity("500", "PHP"), activity("40", "   "))))).isEmpty();
    }


    @Test
    void aPlanPricedEntirelyWithoutCurrencyStillTotals() {
        EstimatedCost cost = EstimatedCost.derivedFrom(List.of(day(activity("500", null), activity("40", "")))).orElseThrow();

        assertThat(cost.amount()).isEqualByComparingTo("540");
        assertThat(cost.currency()).isNull();
    }


    @Test
    void aFreeActivityCostsNothingAndVotesOnNoCurrency() {
        EstimatedCost cost = EstimatedCost.derivedFrom(List.of(day(activity("500", "PHP"), activity("0", null)))).orElseThrow();

        
        assertThat(cost.amount()).isEqualByComparingTo("500");
        assertThat(cost.currency()).isEqualTo("PHP");
    }


    @Test
    void aPlanOfNothingButFreeActivitiesHasNoEstimatedTotal() {
        assertThat(EstimatedCost.derivedFrom(List.of(day(activity("0", "PHP"), activity("0", null))))).isEmpty();
    }


    @Test
    void theCurrencyCodeIsComparedWithoutCasingOrPadding() {
        EstimatedCost cost = EstimatedCost.derivedFrom(List.of(day(activity("500", "php"), activity("40", " PHP ")))).orElseThrow();

        assertThat(cost.currency()).isEqualTo("PHP");
    }


    private static DayView day(ActivityView... activities) {
        return new DayView(UuidV7.generate(), 1, null, List.of(activities));
    }

    private static ActivityView activity(String amount, String currency) {
        return everyActivityAlsoCarriesAnUnrelatedBookingPrice(amount, currency);
    }

    private static ActivityView everyActivityAlsoCarriesAnUnrelatedBookingPrice(String amount, String currency) {
        return new ActivityView(
                UuidV7.generate(),
                0,
                "Activity",
                null,
                amount == null ? null : new BigDecimal(amount),
                currency,
                null,
                null,
                null,
                null,
                null,
                null,
                new BigDecimal("99999"),
                "XXX",
                UuidV7.generate(),
                null);
    }
}
