package com.largata.itinerary;

import com.largata.common.error.ValidationException;
import java.util.Locale;


public record DiscoveryFilters(String query, String destination, DurationBand duration) {

    public static final int MIN_QUERY_LENGTH = 2;

    public static final int MAX_QUERY_LENGTH = 80;


    public static DiscoveryFilters of(String query, String destination, String duration) {
        return new DiscoveryFilters(
                normalizedQuery(query), blankToNull(destination), DurationBand.parse(duration));
    }


    public Integer minDays() {
        return duration == null ? null : duration.minDays();
    }


    public Integer maxDays() {
        return duration == null ? null : duration.maxDays();
    }


    private static String normalizedQuery(String query) {
        String trimmed = blankToNull(query);
        if (trimmed == null) {
            return null;
        }
        if (trimmed.length() < MIN_QUERY_LENGTH) {
            throw new ShortQueryException();
        }
        if (trimmed.length() > MAX_QUERY_LENGTH) {
            throw new LongQueryException();
        }
        return trimmed;
    }


    private static String blankToNull(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }


    public enum DurationBand {
        ONE_TO_THREE("1-3", 1, 3),
        FOUR_TO_SEVEN("4-7", 4, 7),
        EIGHT_TO_FOURTEEN("8-14", 8, 14),
        FIFTEEN_PLUS("15+", 15, null);

        private final String wireName;
        private final int minDays;
        private final Integer maxDays;

        DurationBand(String wireName, int minDays, Integer maxDays) {
            this.wireName = wireName;
            this.minDays = minDays;
            this.maxDays = maxDays;
        }

        public String wireName() {
            return wireName;
        }

        public int minDays() {
            return minDays;
        }

        public Integer maxDays() {
            return maxDays;
        }

        static DurationBand parse(String raw) {
            if (raw == null || raw.trim().isEmpty()) {
                return null;
            }
            String wanted = raw.trim().toLowerCase(Locale.ROOT);
            for (DurationBand band : values()) {
                if (band.wireName.equals(wanted)) {
                    return band;
                }
            }
            throw new UnknownDurationException(raw);
        }
    }


    public static class ShortQueryException extends ValidationException {
        public ShortQueryException() {
            super(
                    "QUERY_TOO_SHORT",
                    "Type at least " + MIN_QUERY_LENGTH + " characters to search.");
        }
    }


    public static class LongQueryException extends ValidationException {
        public LongQueryException() {
            super("QUERY_TOO_LONG", "A search is capped at " + MAX_QUERY_LENGTH + " characters.");
        }
    }


    public static class UnknownDurationException extends ValidationException {
        public UnknownDurationException(String raw) {
            super("UNKNOWN_DURATION", "That trip length is not one we filter by.");
        }
    }
}
