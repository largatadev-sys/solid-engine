package com.largata.itinerary;

import com.largata.common.authz.Membership;
import com.largata.common.authz.MembershipResolver;
import com.largata.common.authz.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * S0.3's membership lookup: standing comes from ownership, because ownership is all that exists yet
 * (ADR-011).
 *
 * <p>The Workspace — and with it real membership rows, invitations and the {@code MEMBER} role —
 * arrives at S1.1. Until then this resolver answers the guard's question from the itinerary's
 * {@code owner_id}: your itinerary, or no standing at all. The synthesized {@link Role#OWNER} is
 * truthful rather than a placeholder: the creator <em>is</em> the owner, atomically and from the
 * first instant (Artifact 03), and S1.1's Workspace will record exactly that fact as a row.
 *
 * <p><strong>This class is the story's disposable half.</strong> At S1.1 it is deleted and the
 * workspace module registers a row-backed resolver in its place; the guard, every controller and
 * every service signature stay untouched. That is the whole point of the seam — and it is why this
 * lives in the itinerary module rather than in {@code common}: only this module may query its own
 * tables (ADR-002), and {@code common} must not depend on a module.
 *
 * <p><strong>S1.1 obligation, recorded in the epic map:</strong> itineraries created before E1 have
 * no Workspace, so S1.1 must backfill one (plus an owner Membership row) for each — otherwise the
 * day this resolver is replaced, every pre-E1 itinerary becomes invisible to its own creator.
 */
@Component
class OwnerMembershipResolver implements MembershipResolver {

    private final ItineraryRepository itineraries;

    OwnerMembershipResolver(ItineraryRepository itineraries) {
        this.itineraries = itineraries;
    }

    @Override
    public Optional<Membership> resolve(UUID travelerId, UUID itineraryId) {
        // One indexed existence check, not a load: the guard needs an answer, not the aggregate.
        // The query cannot distinguish "no such itinerary" from "someone else's" — and must not
        // (Artifact 03's masking rule); both are simply the absence of a row matching both columns.
        return itineraries.existsByIdAndOwnerId(itineraryId, travelerId)
                ? Optional.of(new Membership(travelerId, itineraryId, Role.OWNER))
                : Optional.empty();
    }
}
