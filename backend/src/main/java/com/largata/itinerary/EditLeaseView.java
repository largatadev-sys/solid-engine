package com.largata.itinerary;

import java.time.Instant;
import java.util.UUID;

/**
 * A granted lease as the acquiring/renewing caller sees it (S1.4): who holds it and when it lapses.
 *
 * <p>A read-model, not the entity ({@link EditLease} is package-private, ADR-002). The client needs
 * {@code expiresAt} to know when to stop trusting its own hold — though renewal, not the client's own
 * clock, is what actually keeps a live editor's lease alive.
 */
public record EditLeaseView(UUID itineraryId, UUID holderId, Instant expiresAt) {

    static EditLeaseView of(EditLease lease) {
        return new EditLeaseView(lease.itineraryId(), lease.holderId(), lease.expiresAt());
    }
}
