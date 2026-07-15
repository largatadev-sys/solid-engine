package com.largata.identity.api;

import com.largata.identity.Traveler;
import java.util.UUID;

/**
 * The authenticated traveler, as {@code GET /v1/me} returns them.
 *
 * <p><strong>Three fields, deliberately</strong> (spec, decision 7). No {@code firebaseUid}: it is
 * the auth boundary's key, not a domain fact, and the client already knows its own UID from the
 * Firebase SDK. No {@code createdAt}: nothing consumes it. Under ADR-008 the contract is additive
 * forever — a field omitted today can be added the moment something needs it, a field shipped today
 * can never be removed. The asymmetry is the whole argument for starting minimal.
 */
public record MeResponse(UUID id, String displayName, String email) {

    public static MeResponse of(Traveler traveler) {
        return new MeResponse(traveler.id(), traveler.displayName(), traveler.email());
    }
}
