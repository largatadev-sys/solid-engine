package com.largata.common.authz;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * The single authorization chokepoint (Artifact 03, ADR-003, ADR-011).
 *
 * <p>Every access to workspace-walled content passes through here or does not happen. The guarantee
 * is structural rather than disciplinary: this class is the only producer of {@link Membership}, and
 * service methods that touch private content require one as a parameter — so an unguarded path does
 * not compile. Artifact 03's mechanical review question ("is any workspace-table query reachable
 * outside the guard's flow?") is answerable by looking at signatures.
 *
 * <p><strong>What is deliberately absent.</strong> No visibility logic (public reads bypass the
 * guard and check the object's visibility instead — S4.1), no role enforcement (owner-only acts
 * check {@code membership.isOwner()} on the object this returns, at the story that owns them), no
 * caching (the resolver's lookup is a single indexed row read; a cache here would be a correctness
 * risk taken for a cost nobody has measured). This class does one thing.
 *
 * <p><strong>Its shape is permanent; its lookup is not</strong> — see {@link MembershipResolver}.
 * At S1.1 the resolver becomes row-backed and this file does not change.
 */
@Component
public class AuthorizationGuard {

    private final MembershipResolver resolver;

    public AuthorizationGuard(MembershipResolver resolver) {
        this.resolver = resolver;
    }

    /**
     * Resolves the traveler's standing on the itinerary, or rejects.
     *
     * <p>Rejection is {@link ItineraryNotFoundException} for every reason — nonexistent and
     * not-yours are one answer, by design (Artifact 03's masking rule). There is no overload that
     * returns an {@code Optional}: the guard's job is to stop the request, and an optional would
     * invite a caller to shrug at the empty case.
     *
     * @return the caller's verified standing — the token every private-content service method
     *     demands
     * @throws ItineraryNotFoundException if the traveler has no standing on this itinerary
     */
    public Membership requireMember(UUID travelerId, UUID itineraryId) {
        return resolver.resolve(travelerId, itineraryId).orElseThrow(ItineraryNotFoundException::new);
    }
}
