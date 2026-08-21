package com.largata.support;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;
import org.springframework.jdbc.core.JdbcTemplate;


public final class ShortHandles {

    public static String mintUnclaimed(JdbcTemplate jdbc) {
        return firstUnclaimed(candidate -> isUnclaimed(jdbc, candidate));
    }


    static String firstUnclaimed(Predicate<String> unclaimed) {
        for (int attempt = 0; attempt < COMBINATIONS; attempt++) {
            String candidate = next();
            if (unclaimed.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException(
                "no unclaimed two-character handle remains after " + COMBINATIONS + " candidates");
    }


    private ShortHandles() {}


    private static boolean isUnclaimed(JdbcTemplate jdbc, String candidate) {
        Long holders =
                jdbc.queryForObject(
                        "SELECT count(*) FROM traveler WHERE lower(handle) = ?", Long.class, candidate);
        return holders != null && holders == 0L;
    }


    private static String next() {
        int minted = MINTED.getAndIncrement();
        return "" + ALPHABET.charAt(minted / ALPHABET.length() % ALPHABET.length())
                + ALPHABET.charAt(minted % ALPHABET.length());
    }


    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz";

    private static final int COMBINATIONS = ALPHABET.length() * ALPHABET.length();

    private static final AtomicInteger MINTED = new AtomicInteger();
}
