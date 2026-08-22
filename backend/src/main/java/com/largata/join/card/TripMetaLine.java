package com.largata.join.card;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;


public final class TripMetaLine {

    private static final String SEPARATOR = " · ";

    private static final String RANGE_DASH = "–";

    private TripMetaLine() {}


    public static String of(String destination, LocalDate startDate, LocalDate endDate) {
        List<String> parts = new ArrayList<>();
        if (destination != null && !destination.isEmpty()) {
            parts.add(destination);
        }
        String dates = compactDateRange(startDate, endDate);
        if (dates != null) {
            parts.add(dates);
        }
        return parts.isEmpty() ? null : String.join(SEPARATOR, parts);
    }


    public static String compactDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            return null;
        }
        String from = monthAndDay(startDate);
        if (endDate == null) {
            return from;
        }
        return startDate.getMonth() == endDate.getMonth()
                ? from + RANGE_DASH + endDate.getDayOfMonth()
                : from + RANGE_DASH + monthAndDay(endDate);
    }


    private static String monthAndDay(LocalDate date) {
        return date.getMonth().getDisplayName(TextStyle.SHORT, Locale.US) + " " + date.getDayOfMonth();
    }
}
