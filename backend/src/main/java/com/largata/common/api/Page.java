package com.largata.common.api;

import java.util.List;
import java.util.function.Function;

/**
 * The one pagination shape (Artifact 05): {@code { items, nextCursor }}, for every list in the API,
 * no exceptions (P5).
 *
 * <p>Lives in {@code common} because it belongs to no module — S0.3's itinerary list is merely the
 * first to need it; E4's discovery feed and workspace activity get the same envelope.
 *
 * <p><strong>Cursor, not page/offset</strong> — chosen for the lists this product actually has,
 * which are append-heavy. Under {@code OFFSET}, a row inserted while a client pages through shifts
 * the window: items duplicate or vanish between pages, silently and only under concurrency. A
 * keyset cursor names the last row seen, so new arrivals cannot disturb the traversal.
 *
 * <p><strong>{@code nextCursor} is opaque</strong> — clients pass it back verbatim and never parse
 * it. That is what lets the cursor's internals change (a composite sort key, say) without an API
 * break, and it is why {@code null} rather than a sentinel marks exhaustion: absence needs no
 * interpretation.
 *
 * @param items this page, in the list's order
 * @param nextCursor pass to the next request to continue; {@code null} when the list is exhausted
 */
public record Page<T>(List<T> items, String nextCursor) {

    public static <T> Page<T> exhausted(List<T> items) {
        return new Page<>(items, null);
    }

    public static <T> Page<T> of(List<T> items, String nextCursor) {
        return new Page<>(items, nextCursor);
    }

    /**
     * The same page, its items mapped — for the controller hop from entities to response DTOs.
     *
     * <p>Here rather than at each call site so that a controller never has to know this envelope has
     * two fields, let alone remember to carry the cursor across. Every list endpoint in the API makes
     * exactly this hop; the alternative is the same three lines copied per controller, and the first
     * copy that forgets {@code nextCursor} silently truncates a traveler's list at page one.
     */
    public <R> Page<R> map(Function<T, R> mapper) {
        return new Page<>(items.stream().map(mapper).toList(), nextCursor);
    }
}
