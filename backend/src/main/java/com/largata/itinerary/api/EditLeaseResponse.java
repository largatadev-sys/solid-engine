package com.largata.itinerary.api;

import com.largata.itinerary.EditLeaseView;
import java.time.Instant;
import java.util.UUID;


public record EditLeaseResponse(
        UUID itineraryId, String subjectType, UUID subjectId, UUID holderId, Instant expiresAt) {

    public static EditLeaseResponse of(EditLeaseView lease) {
        return new EditLeaseResponse(
                lease.itineraryId(),
                lease.subject().type().wireName(),
                lease.subject().id(),
                lease.holderId(),
                lease.expiresAt());
    }
}
