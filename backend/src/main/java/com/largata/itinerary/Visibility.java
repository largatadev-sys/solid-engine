package com.largata.itinerary;

/**
 * Who may read a published Itinerary (02-domain-model, Artifact 03).
 *
 * <p>S0.3 only ever produces {@code PRIVATE} — publishing is S4.1's act, and register #11 decides
 * the edit-after-publish policy there.
 *
 * <p>{@code UNLISTED} is not a weaker {@code PUBLIC}: it means "anyone holding the link", and it is
 * enforced by nothing but the id being unguessable — which is why Artifact 05 makes UUIDv7-class ids
 * a functional requirement rather than a style choice. {@code friends_only} is reserved by the model
 * and deliberately absent from this enum until the friend graph exists (a backlog epic): a value
 * nothing can produce is a value that lies.
 */
public enum Visibility {
    PRIVATE,
    UNLISTED,
    PUBLIC;

    /** The wire and column form: lower-case, as the API contract and V3 both spell it. */
    public String wireName() {
        return name().toLowerCase();
    }
}
