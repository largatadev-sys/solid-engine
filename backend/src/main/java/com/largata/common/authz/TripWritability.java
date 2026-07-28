package com.largata.common.authz;

import java.util.UUID;

/**
 * Whether a trip currently accepts writes — the seam behind {@link WriteFence} (S1.9).
 *
 * <p><strong>Exactly ADR-011's pattern, for exactly ADR-011's reason.</strong> The fence lives in
 * {@code common} so every module can reach it, but the fact it needs — the workspace's state — lives
 * in the {@code workspace} module. A direct call would point {@code common} at a module and close the
 * dependency cycle the resolver seam was invented to prevent. So the same trick: a one-method
 * interface here, its implementation over there.
 *
 * <p>One method, one question, no {@code Optional}: a trip whose workspace cannot be found is an
 * invariant breach (INV: no itinerary without a workspace), and the implementation fails loudly
 * rather than handing back an ambiguous answer the fence would have to interpret as permission.
 */
public interface TripWritability {

    /** Whether the trip is frozen against writes — {@code true} exactly when its workspace is archived. */
    boolean isFrozen(UUID itineraryId);
}
