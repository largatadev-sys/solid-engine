package com.largata.itinerary;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class EditLeaseInserter {

    private final EditLeaseRepository leases;

    EditLeaseInserter(EditLeaseRepository leases) {
        this.leases = leases;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    EditLease insert(UUID itineraryId, LeaseSubject subject, UUID holderId, Instant acquiredAt, Instant expiresAt) {
        return leases.saveAndFlush(EditLease.heldBy(itineraryId, subject, holderId, acquiredAt, expiresAt));
    }
}
