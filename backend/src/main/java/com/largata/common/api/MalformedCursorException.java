package com.largata.common.api;

import com.largata.common.error.ValidationException;

/**
 * A cursor this API did not issue — 400 (Artifact 05's validation row).
 *
 * <p>A cursor arrives from outside, so a mangled one is a bad request, not a broken server. Left to
 * blow up naturally it would surface as {@code IllegalArgumentException} → the unmapped-exception
 * handler → a 500 logged at ERROR: the wrong answer to the client, and a page for the operator about
 * someone else's typo.
 *
 * <p>Top-level, like every other exception in the taxonomy (06b §3) — nested inside {@link Cursor} it
 * could not be caught by name without importing a utility holder.
 */
public class MalformedCursorException extends ValidationException {

    MalformedCursorException() {
        super("MALFORMED_CURSOR", "That cursor is not valid. Start from the first page.");
    }
}
