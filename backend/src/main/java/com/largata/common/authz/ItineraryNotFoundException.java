package com.largata.common.authz;

import com.largata.common.error.NotFoundException;

/**
 * The guard's one rejection — and deliberately the <em>only</em> one it has (Artifact 03).
 *
 * <p><strong>Why not-a-member is a 404 and not a 403.</strong> A 403 would be an honest answer to
 * the wrong question: it confirms the itinerary exists. Given unguessable ids, "this id is real but
 * not yours" is information a prober cannot otherwise obtain, and it is exactly what unlisted
 * visibility later depends on nobody being able to learn. So the guard answers one way for "no such
 * itinerary" and "not yours" — same code, same message, same status — and the caller cannot tell
 * which happened. (403 keeps its meaning elsewhere: authenticated, known to have standing, but the
 * <em>role</em> forbids the operation — a member trying an owner-only act at E1.)
 *
 * <p>Lives beside the guard rather than in the itinerary module because the guard throws it, and the
 * guard cannot depend on a module (ADR-011).
 */
public class ItineraryNotFoundException extends NotFoundException {

    ItineraryNotFoundException() {
        super("ITINERARY_NOT_FOUND", "No such itinerary.");
    }
}
