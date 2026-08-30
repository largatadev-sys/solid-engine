package com.largata.publication;

import com.largata.publication.PublicationExceptions.UnknownAudienceException;
import java.util.Locale;


public enum Audience {
    PUBLIC,
    PRIVATE;


    public boolean isVisibleToEveryone() {
        return this == PUBLIC;
    }


    public static Audience parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            return PUBLIC;
        }
        try {
            return valueOf(wireName.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new UnknownAudienceException(wireName);
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
