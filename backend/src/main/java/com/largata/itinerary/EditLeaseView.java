package com.largata.itinerary;

import java.time.Instant;
import java.util.UUID;


public record EditLeaseView(UUID itineraryId, LeaseSubject subject, UUID holderId, Instant expiresAt) {

    static EditLeaseView of(EditLease lease) {
        return new EditLeaseView(lease.itineraryId(), lease.subject(), lease.holderId(), lease.expiresAt());
    }
}
