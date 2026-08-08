package com.largata.identity;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;


public record VanityNumber(short cohort, int poolNumber) {

    public static final short FOUNDER_COHORT = 0;
    public static final short BETA_COHORT = 1;
    private static final short FIRST_LAUNCHED_COHORT = 2;

    private static final VanityNumber FOUNDER = new VanityNumber(FOUNDER_COHORT, 0);


    public static VanityNumber founder() {
        return FOUNDER;
    }


    public static short cohortAt(Instant when, LocalDate launchDate) {
        if (launchDate == null) {
            return BETA_COHORT;
        }
        LocalDate at = LocalDate.ofInstant(when, ZoneOffset.UTC);
        if (at.isBefore(launchDate)) {
            return BETA_COHORT;
        }
        long elapsed = ChronoUnit.MONTHS.between(launchDate.withDayOfMonth(1), at.withDayOfMonth(1));
        return (short) (FIRST_LAUNCHED_COHORT + elapsed);
    }


    public boolean isFounder() {
        return cohort == FOUNDER_COHORT;
    }


    public String formatted() {
        if (isFounder()) {
            return "0";
        }
        return "%02d%04d".formatted(cohort, poolNumber);
    }
}
