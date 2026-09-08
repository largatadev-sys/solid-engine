package com.largata.trip.editing.service;

import java.time.Instant;
import java.util.UUID;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.editing.entity.EditLease;


public record EditLeaseView(UUID itineraryId, LeaseSubject subject, UUID holderId, Instant expiresAt) {

    static EditLeaseView of(EditLease lease) {
        return new EditLeaseView(lease.itineraryId(), lease.subject(), lease.holderId(), lease.expiresAt());
    }
}
