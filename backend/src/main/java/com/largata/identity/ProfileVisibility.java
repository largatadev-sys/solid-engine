package com.largata.identity;

import java.util.Locale;
import java.util.Optional;


public enum ProfileVisibility {
    PUBLIC,
    PRIVATE;


    public boolean isOpenToEveryone() {
        return this == PUBLIC;
    }


    public static Optional<ProfileVisibility> parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(wireName.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException unknown) {
            throw new IdentityExceptions.UnknownProfileVisibilityException(wireName);
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
