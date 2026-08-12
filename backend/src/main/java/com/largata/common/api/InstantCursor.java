package com.largata.common.api;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;


public record InstantCursor(Instant at, UUID id) {

    private static final String SEPARATOR = "|";

    public static String encode(Instant at, UUID id) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((at.toString() + SEPARATOR + id).getBytes(StandardCharsets.UTF_8));
    }


    public static InstantCursor decode(String cursor) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int split = decoded.lastIndexOf(SEPARATOR);
            if (split < 0) {
                throw new MalformedCursorException();
            }
            return new InstantCursor(
                    Instant.parse(decoded.substring(0, split)),
                    UUID.fromString(decoded.substring(split + SEPARATOR.length())));
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException notACursorWeIssued) {
            throw new MalformedCursorException();
        }
    }
}
