package com.largata.publication;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "itinerary_object")
public class ItineraryObject {

    @Id private UUID id;

    @Column(name = "trip_id", nullable = false, updatable = false)
    private UUID tripId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Audience audience;

    @Column(nullable = false)
    private String plan;

    @Column(nullable = false)
    private boolean retired;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "retired_at")
    private Instant retiredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ItineraryObject() {}

    private ItineraryObject(UUID id, UUID tripId, UUID ownerId, Audience audience, String plan, Instant at) {
        this.id = id;
        this.tripId = tripId;
        this.ownerId = ownerId;
        this.audience = audience;
        this.plan = plan;
        this.retired = false;
        this.publishedAt = at;
        this.createdAt = at;
    }


    static ItineraryObject mintedFrom(UUID tripId, UUID ownerId, Audience audience, String plan, Instant at) {
        if (tripId == null || ownerId == null || audience == null || plan == null || at == null) {
            throw new IllegalArgumentException(
                    "An itinerary object is minted from a trip, for an owner, to an audience, at an instant");
        }
        return new ItineraryObject(UuidV7.generate(), tripId, ownerId, audience, plan, at);
    }


    void refresh(Audience toAudience, String freshPlan, Instant at) {
        this.audience = toAudience;
        this.plan = freshPlan;
        this.retired = false;
        this.retiredAt = null;
        this.publishedAt = at;
    }


    void retire(Instant at) {
        this.retired = true;
        this.retiredAt = at;
    }


    boolean isOwnedBy(UUID travelerId) {
        return ownerId.equals(travelerId);
    }

    public UUID id() {
        return id;
    }

    public UUID tripId() {
        return tripId;
    }

    public UUID ownerId() {
        return ownerId;
    }

    public Audience audience() {
        return audience;
    }

    public String plan() {
        return plan;
    }

    public boolean isRetired() {
        return retired;
    }

    public Instant publishedAt() {
        return publishedAt;
    }

    public Instant retiredAt() {
        return retiredAt;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
