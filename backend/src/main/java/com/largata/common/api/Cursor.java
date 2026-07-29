package com.largata.common.api;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;


public final class Cursor {

    private Cursor() {}

    public static String encode(UUID lastSeen) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(lastSeen.toString().getBytes(StandardCharsets.UTF_8));
    }


    public static UUID decode(String cursor) {
        try {
            return UUID.fromString(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException notACursorWeIssued) {
            throw new MalformedCursorException();
        }
    }
}
