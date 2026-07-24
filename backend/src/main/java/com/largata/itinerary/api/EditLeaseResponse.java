package com.largata.itinerary.api;

import com.largata.itinerary.EditLeaseView;
import java.time.Instant;
import java.util.UUID;

/**
 * A granted edit lease as the API returns it (S1.4): the holder and when it lapses. What acquire and
 * renew hand back so the client knows it holds the lock and until when.
 */
public record EditLeaseResponse(UUID itineraryId, UUID holderId, Instant expiresAt) {

    public static EditLeaseResponse of(EditLeaseView lease) {
        return new EditLeaseResponse(lease.itineraryId(), lease.holderId(), lease.expiresAt());
    }
}
