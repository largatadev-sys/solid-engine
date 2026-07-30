package com.largata.identity;

import java.util.Locale;
import java.util.function.Predicate;


final class HandleSuggestion {

    private static final String FALLBACK_STEM = "wanderer";
    private static final int MAX_TRIES = 200;

    private HandleSuggestion() {}


    static String from(String displayName, String email, Predicate<String> isTaken) {
        String stem = stemOf(displayName, email);
        if (isFree(stem, isTaken)) {
            return stem;
        }
        for (int suffix = 1; suffix <= MAX_TRIES; suffix++) {
            String candidate = truncate(stem, Handle.MAX_LENGTH - String.valueOf(suffix).length()) + suffix;
            if (isFree(candidate, isTaken)) {
                return candidate;
            }
        }
        return "";
    }


    static String stemOf(String displayName, String email) {
        String fromName = strip(displayName);
        if (fromName.length() >= Handle.MIN_LENGTH) {
            return truncate(fromName, Handle.MAX_LENGTH);
        }
        String fromEmail = strip(localPartOf(email));
        if (fromEmail.length() >= Handle.MIN_LENGTH) {
            return truncate(fromEmail, Handle.MAX_LENGTH);
        }
        return FALLBACK_STEM;
    }

    private static boolean isFree(String candidate, Predicate<String> isTaken) {
        return Handle.check(candidate) == Handle.Availability.FREE && !isTaken.test(candidate);
    }

    private static String localPartOf(String email) {
        if (email == null) {
            return "";
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private static String strip(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]", "");
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
