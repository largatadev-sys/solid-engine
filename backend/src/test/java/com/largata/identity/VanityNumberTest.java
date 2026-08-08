package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;


class VanityNumberTest {

    private static Instant utc(String isoDate) {
        return LocalDate.parse(isoDate).atStartOfDay(ZoneOffset.UTC).toInstant();
    }


    @Test
    void aFounderRendersTheBareZero() {
        assertThat(VanityNumber.founder().formatted()).isEqualTo("0");
    }


    @Test
    void aSchemeNumberPadsCohortToTwoDigitsAndDrawToFour() {
        assertThat(new VanityNumber((short) 1, 42).formatted()).isEqualTo("010042");
        assertThat(new VanityNumber((short) 2, 0).formatted()).isEqualTo("020000");
        assertThat(new VanityNumber((short) 12, 9999).formatted()).isEqualTo("129999");
    }


    @Test
    void aDrawPastTheFourthDigitWidensRatherThanTruncating() {
        assertThat(new VanityNumber((short) 3, 10000).formatted()).isEqualTo("0310000");
    }


    @Test
    void aCohortPastTheSecondDigitWidensRatherThanTruncating() {
        assertThat(new VanityNumber((short) 100, 7).formatted()).isEqualTo("1000007");
    }


    @Test
    void everySignUpIsBetaWhileTheLaunchDateIsUnset() {
        assertThat(VanityNumber.cohortAt(utc("2026-08-08"), null)).isEqualTo((short) 1);
        assertThat(VanityNumber.cohortAt(utc("2031-01-01"), null)).isEqualTo((short) 1);
    }


    @Test
    void aSignUpBeforeLaunchStaysBetaEvenOnceTheLaunchDateIsSet() {
        assertThat(VanityNumber.cohortAt(utc("2026-08-08"), LocalDate.parse("2026-09-01")))
                .isEqualTo((short) 1);
    }


    @Test
    void theLaunchMonthIsCohortTwoAndEachCalendarMonthAddsOne() {
        LocalDate launch = LocalDate.parse("2026-09-15");

        assertThat(VanityNumber.cohortAt(utc("2026-09-15"), launch)).isEqualTo((short) 2);
        assertThat(VanityNumber.cohortAt(utc("2026-09-30"), launch)).isEqualTo((short) 2);
        assertThat(VanityNumber.cohortAt(utc("2026-10-01"), launch)).isEqualTo((short) 3);
        assertThat(VanityNumber.cohortAt(utc("2026-10-31"), launch)).isEqualTo((short) 3);
        assertThat(VanityNumber.cohortAt(utc("2027-09-01"), launch)).isEqualTo((short) 14);
    }


    @Test
    void theCohortCountsCalendarMonthsNotThirtyDayBlocks() {
        LocalDate launch = LocalDate.parse("2026-09-30");

        assertThat(VanityNumber.cohortAt(utc("2026-10-01"), launch)).isEqualTo((short) 3);
    }
}
