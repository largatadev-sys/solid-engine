package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "fork_relationship")
class ForkRelationship {

    @Id private UUID id;

    @Column(name = "source_itinerary_id", nullable = false, updatable = false)
    private UUID sourceItineraryId;

    @Column(name = "forked_itinerary_id", nullable = false, updatable = false)
    private UUID forkedItineraryId;

    @Column(name = "forked_at", nullable = false, updatable = false)
    private Instant forkedAt;

    protected ForkRelationship() {
    }

    private ForkRelationship(UUID id, UUID sourceItineraryId, UUID forkedItineraryId, Instant forkedAt) {
        this.id = id;
        this.sourceItineraryId = sourceItineraryId;
        this.forkedItineraryId = forkedItineraryId;
        this.forkedAt = forkedAt;
    }


    static ForkRelationship recording(UUID sourceItineraryId, UUID forkedItineraryId, Instant forkedAt) {
        if (sourceItineraryId == null || forkedItineraryId == null || forkedAt == null) {
            throw new IllegalArgumentException("A fork relationship names a source, a copy and an instant");
        }
        if (sourceItineraryId.equals(forkedItineraryId)) {
            throw new IllegalArgumentException("An itinerary cannot be its own source");
        }
        return new ForkRelationship(UuidV7.generate(), sourceItineraryId, forkedItineraryId, forkedAt);
    }

    UUID id() {
        return id;
    }

    UUID sourceItineraryId() {
        return sourceItineraryId;
    }

    UUID forkedItineraryId() {
        return forkedItineraryId;
    }

    Instant forkedAt() {
        return forkedAt;
    }
}
