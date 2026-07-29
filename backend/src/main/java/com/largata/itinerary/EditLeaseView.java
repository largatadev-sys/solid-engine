package com.largata.itinerary;

import java.time.Instant;
import java.util.UUID;


public record EditLeaseView(UUID itineraryId, UUID holderId, Instant expiresAt) {

    static EditLeaseView of(EditLease lease) {
        return new EditLeaseView(lease.itineraryId(), lease.holderId(), lease.expiresAt());
    }
}
