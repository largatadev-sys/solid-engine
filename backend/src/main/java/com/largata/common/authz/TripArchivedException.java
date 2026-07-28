package com.largata.common.authz;

import com.largata.common.error.ConflictException;

/**
 * A write was attempted on an archived trip (S1.9) — 409.
 *
 * <p><strong>A conflict, not a forbidden.</strong> The caller has every right to be here: they are a
 * member, and on a live trip this exact request would succeed. What is wrong is the resource's state,
 * which is {@link ConflictException}'s stated case and Artifact 05's 409. A 403 would say "not you",
 * which is false and would send a client down its permissions branch.
 *
 * <p><strong>Its own code, not {@code ILLEGAL_STATE_TRANSITION}.</strong> That one (S1.7, and S1.9's
 * archive edges) means "this act does not apply from the state you are in", and the client's answer is
 * to refetch and re-render. This means "the trip is frozen; unarchive it to act" — a different sentence
 * and a different remedy, and the remedy is one the client can offer the owner as a button. Since
 * clients branch on the code and never the message (Artifact 05), one code cannot serve both without
 * one of them reading wrong. Adding a code is additive under ADR-008.
 *
 * <p>The message names the remedy rather than the rule, because the person reading it is usually the
 * one who can apply it.
 */
public class TripArchivedException extends ConflictException {

    public TripArchivedException() {
        super("TRIP_ARCHIVED", "This trip is archived. Unarchive it to make changes.");
    }
}
