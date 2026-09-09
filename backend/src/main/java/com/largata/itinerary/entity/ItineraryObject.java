package com.largata.itinerary.entity;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Column private String title;

    @Column private String destination;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    protected ItineraryObject() {}

    private ItineraryObject(
            UUID id, UUID tripId, UUID ownerId, String plan, Instant at, Discoverable facts) {
        this.id = id;
        this.tripId = tripId;
        this.ownerId = ownerId;
        this.plan = plan;
        this.retired = false;
        this.publishedAt = at;
        this.createdAt = at;
        describe(facts);
    }


    public static ItineraryObject mintedFrom(
            UUID tripId, UUID ownerId, String plan, Instant at, Discoverable facts) {
        if (tripId == null || ownerId == null || plan == null || at == null || facts == null) {
            throw new IllegalArgumentException(
                    "An itinerary object is minted from a trip, for an owner, at an instant");
        }
        return new ItineraryObject(UuidV7.generate(), tripId, ownerId, plan, at, facts);
    }


    public void refresh(String freshPlan, Instant at, Discoverable facts) {
        this.plan = freshPlan;
        this.retired = false;
        this.retiredAt = null;
        this.publishedAt = at;
        describe(facts);
    }


    private void describe(Discoverable facts) {
        this.title = facts.title();
        this.destination = facts.destination();
        this.durationDays = facts.durationDays();
        this.coverImageUrl = facts.coverImageUrl();
    }


    public void retire(Instant at) {
        this.retired = true;
        this.retiredAt = at;
    }


    public boolean isOwnedBy(UUID travelerId) {
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

    public String title() {
        return title;
    }

    public String destination() {
        return destination;
    }

    public Integer durationDays() {
        return durationDays;
    }

    public String coverImageUrl() {
        return coverImageUrl;
    }


    public record Discoverable(
            String title, String destination, Integer durationDays, String coverImageUrl) {}
}
