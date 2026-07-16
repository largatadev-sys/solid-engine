package com.largata.common.api;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

/**
 * Encodes and decodes the opaque list cursor (Artifact 05).
 *
 * <p><strong>Base64 is not security and is not pretending to be.</strong> Anyone can decode it; the
 * id inside is already the client's own. Its only job is to make the cursor look like a token rather
 * than a value — a client that sees a bare UUID will eventually try constructing one, and then the
 * cursor's internals are a de-facto contract that ADR-008 will not let us change. Encoding is the
 * cheapest way to say "pass this back, don't read it".
 *
 * <p>Ids are UUIDv7 and therefore ordered by creation, which is what lets a single id serve as the
 * whole cursor — no composite key, no {@code created_at} tiebreaker (see {@code UuidV7}).
 */
public final class Cursor {

    private Cursor() {}

    public static String encode(UUID lastSeen) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(lastSeen.toString().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Decodes a cursor a client handed back.
     *
     * @throws MalformedCursorException if it is not a cursor this API issued — a 400, because a
     *     cursor arrives from outside and a mangled one is a bad request, not a broken server
     */
    public static UUID decode(String cursor) {
        try {
            return UUID.fromString(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException notACursorWeIssued) {
            throw new MalformedCursorException();
        }
    }
}
