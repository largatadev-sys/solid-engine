package com.largata.trip.plan.entity;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import com.largata.trip.trip.entity.Trip;


@Entity
@Table(name = "day")
public class Day {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;


    @Column(nullable = false)
    private int ordinal;


    @Column private String title;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Day() {
    }

    private Day(UUID id, UUID itineraryId, int ordinal, String title, Instant createdAt) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.ordinal = ordinal;
        this.title = title;
        this.createdAt = createdAt;
    }


    static final int MAX_TITLE_LENGTH = Trip.MAX_DAY_TITLE_LENGTH;


    public static Day at(UUID itineraryId, int ordinal, String title, Instant createdAt) {
        if (itineraryId == null || createdAt == null) {
            throw new IllegalArgumentException("A day belongs to an itinerary and is created at an instant");
        }
        if (ordinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        return new Day(UuidV7.generate(), itineraryId, ordinal, normalizeTitle(title), createdAt);
    }


    public static Day copiedInto(UUID itineraryId, Day source, Instant createdAt) {
        return new Day(UuidV7.generate(), itineraryId, source.ordinal, source.title, createdAt);
    }


    public void rename(String newTitle) {
        this.title = normalizeTitle(newTitle);
    }


    public void renumberTo(int newOrdinal) {
        if (newOrdinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        this.ordinal = newOrdinal;
    }

    public static String normalizedTitle(String title) {
        return normalizeTitle(title);
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return null;
        }
        String stripped = title.strip();
        if (stripped.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("A day's title is at most " + MAX_TITLE_LENGTH + " characters");
        }
        return stripped;
    }

    public UUID id() {
        return id;
    }

    public UUID itineraryId() {
        return itineraryId;
    }

    public int ordinal() {
        return ordinal;
    }

    public String title() {
        return title;
    }

    Instant createdAt() {
        return createdAt;
    }
}
