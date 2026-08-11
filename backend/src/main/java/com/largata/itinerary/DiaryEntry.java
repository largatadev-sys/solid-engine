package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;


@Entity
@Table(name = "diary_entry")
class DiaryEntry {

    static final int MAX_CAPTION_LENGTH = 2000;

    @Id private UUID id;

    @Column(name = "traveler_id", nullable = false, updatable = false)
    private UUID travelerId;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;

    @Column(name = "activity_id")
    private UUID activityId;

    @Column(name = "activity_title", nullable = false, updatable = false)
    private String activityTitle;

    @Column(name = "day_label", nullable = false, updatable = false)
    private String dayLabel;

    @Column(name = "time_of_day", updatable = false)
    private LocalTime timeOfDay;

    @Column private String caption;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;


    protected DiaryEntry() {}


    private DiaryEntry(
            UUID id,
            UUID travelerId,
            UUID itineraryId,
            UUID activityId,
            ActivitySnapshot snapshot,
            String caption,
            Instant at) {
        this.id = id;
        this.travelerId = travelerId;
        this.itineraryId = itineraryId;
        this.activityId = activityId;
        this.activityTitle = snapshot.activityTitle();
        this.dayLabel = snapshot.dayLabel();
        this.timeOfDay = snapshot.timeOfDay();
        this.caption = normalizeCaption(caption);
        this.createdAt = at;
        this.updatedAt = at;
    }


    static DiaryEntry postedFrom(
            UUID travelerId,
            UUID itineraryId,
            UUID activityId,
            ActivitySnapshot snapshot,
            String caption,
            Instant at) {
        if (travelerId == null || itineraryId == null || activityId == null || snapshot == null || at == null) {
            throw new IllegalArgumentException(
                    "A diary entry belongs to a traveler and a trip, is posted from an activity at an instant");
        }
        return new DiaryEntry(UuidV7.generate(), travelerId, itineraryId, activityId, snapshot, caption, at);
    }


    void recaption(String newCaption, Instant at) {
        this.caption = normalizeCaption(newCaption);
        this.updatedAt = at;
    }


    boolean isAuthoredBy(UUID candidate) {
        return travelerId.equals(candidate);
    }


    static String normalizeCaption(String caption) {
        if (caption == null || caption.isBlank()) {
            return null;
        }
        String stripped = caption.strip();
        if (stripped.length() > MAX_CAPTION_LENGTH) {
            throw new IllegalArgumentException(
                    "A caption is at most " + MAX_CAPTION_LENGTH + " characters");
        }
        return stripped;
    }


    UUID id() {
        return id;
    }

    UUID travelerId() {
        return travelerId;
    }

    UUID itineraryId() {
        return itineraryId;
    }

    UUID activityId() {
        return activityId;
    }

    String activityTitle() {
        return activityTitle;
    }

    String dayLabel() {
        return dayLabel;
    }

    LocalTime timeOfDay() {
        return timeOfDay;
    }

    String caption() {
        return caption;
    }

    Instant createdAt() {
        return createdAt;
    }

    Instant updatedAt() {
        return updatedAt;
    }
}
