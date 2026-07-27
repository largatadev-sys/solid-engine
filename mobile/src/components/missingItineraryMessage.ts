/**
 * What a traveler is told when a trip will not load because the guard refused it (S1.5).
 *
 * <p><strong>Why the wording changed at S1.5.</strong> Until this story, `ITINERARY_NOT_FOUND` had one
 * cause a traveler could actually hit — a bad or stale link — so "No such itinerary" was true. Removal
 * and leave add a second, and now the server's masked 404 covers two very different situations:
 * the trip does not exist, or it does and you are no longer in it. Artifact 03 requires that those stay
 * indistinguishable — a probe must not learn an id is real from the shape of its rejection — so the
 * copy cannot name which one happened.
 *
 * <p>What it *can* stop doing is asserting the wrong one. "No such itinerary" tells a member who was
 * just removed that their trip never existed, which is false, and reads as data loss rather than as a
 * membership change. Naming both possibilities is honest, leaks nothing (it is the same sentence for
 * both, which is exactly what the mask means), and is the only version that makes sense to whichever
 * traveler is reading it.
 *
 * <p>Shared rather than written into each screen, for the `confirmDestructiveMessage` reason: two
 * screens show this state, and copy duplicated in two places drifts.
 */
export const missingItineraryMessage = {
  title: 'Trip unavailable',
  body: "This trip either no longer exists or you don't have access to it.",
} as const;
