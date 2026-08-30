package com.largata.postcard;

import com.largata.common.id.UuidV7;
import com.largata.postcard.PostcardExceptions.PostcardCaptionTooLongException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;


@Entity
@Table(name = "postcard")
public class Postcard {

    public static final int MAX_CAPTION_LENGTH = 2000;

    @Id private UUID id;

    @Column(name = "author_id", nullable = false, updatable = false)
    private UUID authorId;

    @Column(name = "diary_id", updatable = false)
    private UUID diaryId;

    @Column(name = "trip_id", updatable = false)
    private UUID tripId;

    @Column(name = "activity_id", updatable = false)
    private UUID activityId;

    @Column(name = "activity_title", updatable = false)
    private String activityTitle;

    @Column(name = "day_label", updatable = false)
    private String dayLabel;

    @Column(name = "time_of_day", updatable = false)
    private LocalTime timeOfDay;

    @Column(updatable = false)
    private String place;

    @Column private String caption;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Postcard() {}

    private Postcard(
            UUID id,
            UUID authorId,
            UUID diaryId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            String caption,
            Instant at) {
        this.id = id;
        this.authorId = authorId;
        this.diaryId = diaryId;
        this.tripId = tripId;
        this.activityId = activityId;
        this.activityTitle = activityTitle;
        this.dayLabel = dayLabel;
        this.timeOfDay = timeOfDay;
        this.place = normalize(place);
        this.caption = normalizeCaption(caption);
        this.createdAt = at;
        this.updatedAt = at;
    }


    static Postcard standalone(UUID authorId, UUID diaryId, String place, String caption, Instant at) {
        if (authorId == null || at == null) {
            throw new IllegalArgumentException("A postcard has an author and a moment");
        }
        return new Postcard(
                UuidV7.generate(), authorId, diaryId, null, null, null, null, null, place, caption, at);
    }


    static Postcard postedFromActivity(
            UUID authorId,
            UUID diaryId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            String caption,
            Instant at) {
        if (authorId == null || diaryId == null || tripId == null || activityId == null || at == null) {
            throw new IllegalArgumentException(
                    "A trip-derived postcard has an author, a trip diary, and the activity it was posted from");
        }
        return new Postcard(
                UuidV7.generate(),
                authorId,
                diaryId,
                tripId,
                activityId,
                activityTitle,
                dayLabel,
                timeOfDay,
                place,
                caption,
                at);
    }


    void recaption(String newCaption, Instant at) {
        this.caption = normalizeCaption(newCaption);
        this.updatedAt = at;
    }


    boolean isAuthoredBy(UUID candidate) {
        return authorId.equals(candidate);
    }


    static String normalizeCaption(String caption) {
        String stripped = normalize(caption);
        if (stripped != null && stripped.length() > MAX_CAPTION_LENGTH) {
            throw new PostcardCaptionTooLongException(MAX_CAPTION_LENGTH);
        }
        return stripped;
    }


    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }


    public UUID id() {
        return id;
    }

    public UUID authorId() {
        return authorId;
    }

    public UUID diaryId() {
        return diaryId;
    }

    public UUID tripId() {
        return tripId;
    }

    public UUID activityId() {
        return activityId;
    }

    public String activityTitle() {
        return activityTitle;
    }

    public String dayLabel() {
        return dayLabel;
    }

    public LocalTime timeOfDay() {
        return timeOfDay;
    }

    public String place() {
        return place;
    }

    public String caption() {
        return caption;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
