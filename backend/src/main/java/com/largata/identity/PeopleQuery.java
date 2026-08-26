package com.largata.identity;

import java.util.Locale;
import java.util.Optional;


public record PeopleQuery(String prefix) {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 80;


    public static Optional<PeopleQuery> of(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String trimmed = raw.strip();
        if (trimmed.length() < MIN_LENGTH) {
            return Optional.empty();
        }
        if (looksLikeAnEmail(trimmed)) {
            return Optional.empty();
        }
        String typed = trimmed.startsWith("@") ? trimmed.substring(1) : trimmed;
        if (typed.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(
                new PeopleQuery(
                        typed.substring(0, Math.min(typed.length(), MAX_LENGTH))
                                .toLowerCase(Locale.ROOT)));
    }


    private static boolean looksLikeAnEmail(String candidate) {
        return candidate.indexOf('@') > 0;
    }
}
