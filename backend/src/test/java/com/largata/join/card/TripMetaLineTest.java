package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;


class TripMetaLineTest {

    @Test
    void itJoinsDestinationAndDates() {
        assertThat(TripMetaLine.of("El Nido", date("2026-03-12"), date("2026-03-18")))
                .isEqualTo("El Nido · Mar 12–18");
    }


    @Test
    void itSpellsTheSecondMonthWhenATripCrossesOne() {
        assertThat(TripMetaLine.compactDateRange(date("2026-03-28"), date("2026-04-03")))
                .isEqualTo("Mar 28–Apr 3");
    }


    @Test
    void itDropsWhatItDoesNotHaveRatherThanRenderingAStraySeparator() {
        assertThat(TripMetaLine.of("El Nido", null, null)).isEqualTo("El Nido");
        assertThat(TripMetaLine.of(null, date("2026-03-12"), date("2026-03-18")))
                .isEqualTo("Mar 12–18");
        assertThat(TripMetaLine.of(null, null, null)).isNull();
    }


    @Test
    void itShowsASingleDateWhenTheTripHasNoEnd() {
        assertThat(TripMetaLine.compactDateRange(date("2026-03-12"), null)).isEqualTo("Mar 12");
    }


    @Test
    void anEmptyDestinationIsDroppedTheSameWayAsAnAbsentOne() {
        assertThat(TripMetaLine.of("", date("2026-03-12"), date("2026-03-18")))
                .isEqualTo("Mar 12–18");
        assertThat(TripMetaLine.of("", null, null)).isNull();
    }


    @Test
    void anEndWithoutAStartRendersNoDatesAtAll() {
        assertThat(TripMetaLine.compactDateRange(null, date("2026-03-18"))).isNull();
        assertThat(TripMetaLine.of("El Nido", null, date("2026-03-18"))).isEqualTo("El Nido");
    }


    @Test
    void anEndBeforeItsStartStillRendersRatherThanThrowing() {
        assertThat(TripMetaLine.compactDateRange(date("2026-03-18"), date("2026-03-12")))
                .isEqualTo("Mar 18–12");
    }


    @Test
    void aRangeCrossingNewYearSpellsBothMonths() {
        assertThat(TripMetaLine.compactDateRange(date("2026-12-28"), date("2027-01-03")))
                .isEqualTo("Dec 28–Jan 3");
    }


    @Test
    void theDayNumberIsNeverZeroPadded() {
        assertThat(TripMetaLine.compactDateRange(date("2026-03-05"), null)).isEqualTo("Mar 5");
    }


    private static LocalDate date(String iso) {
        return LocalDate.parse(iso);
    }
}
