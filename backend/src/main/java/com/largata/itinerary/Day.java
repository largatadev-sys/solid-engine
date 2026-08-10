package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "day")
class Day {

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


    static final int MAX_TITLE_LENGTH = Itinerary.MAX_DAY_TITLE_LENGTH;


    static Day at(UUID itineraryId, int ordinal, String title, Instant createdAt) {
        if (itineraryId == null || createdAt == null) {
            throw new IllegalArgumentException("A day belongs to an itinerary and is created at an instant");
        }
        if (ordinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        return new Day(UuidV7.generate(), itineraryId, ordinal, normalizeTitle(title), createdAt);
    }


    void rename(String newTitle) {
        this.title = normalizeTitle(newTitle);
    }


    void renumberTo(int newOrdinal) {
        if (newOrdinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        this.ordinal = newOrdinal;
    }

    static String normalizedTitle(String title) {
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

    UUID id() {
        return id;
    }

    UUID itineraryId() {
        return itineraryId;
    }

    int ordinal() {
        return ordinal;
    }

    String title() {
        return title;
    }

    Instant createdAt() {
        return createdAt;
    }
}
