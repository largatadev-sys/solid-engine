package com.largata.postcard;

import com.largata.common.geo.InvalidPinException;
import com.largata.common.geo.Pin;
import com.largata.common.id.UuidV7;
import com.largata.postcard.PostcardExceptions.PostcardCaptionTooLongException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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

    @Column(name = "diary_id")
    private UUID diaryId;

    @Column(name = "diary_day_id")
    private UUID diaryDayId;

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

    @Column(updatable = false)
    private BigDecimal latitude;

    @Column(updatable = false)
    private BigDecimal longitude;

    @Column(updatable = false)
    private Short zoom;

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
            UUID diaryDayId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            BigDecimal latitude,
            BigDecimal longitude,
            Short zoom,
            String caption,
            Instant at) {
        this.id = id;
        this.authorId = authorId;
        this.diaryId = diaryId;
        this.diaryDayId = diaryDayId;
        this.tripId = tripId;
        this.activityId = activityId;
        this.activityTitle = activityTitle;
        this.dayLabel = dayLabel;
        this.timeOfDay = timeOfDay;
        this.place = normalize(place);
        this.latitude = latitude;
        this.longitude = longitude;
        this.zoom = zoom;
        this.caption = normalizeCaption(caption);
        this.createdAt = at;
        this.updatedAt = at;
    }


    static Postcard standalone(
            UUID authorId, UUID diaryId, String place, Pin pin, String caption, Instant at) {
        if (authorId == null || at == null) {
            throw new IllegalArgumentException("A postcard has an author and a moment");
        }
        requirePlaceFor(pin, place);
        return new Postcard(
                UuidV7.generate(), authorId, diaryId, null, null, null, null, null, null, place,
                latitudeOf(pin), longitudeOf(pin), zoomOf(pin), caption, at);
    }


    private static void requirePlaceFor(Pin pin, String place) {
        if (pin != null && (place == null || place.isBlank())) {
            throw new InvalidPinException("A pinned postcard needs a place a traveler can read.");
        }
    }


    private static java.math.BigDecimal latitudeOf(Pin pin) {
        return pin == null ? null : pin.latitude();
    }


    private static java.math.BigDecimal longitudeOf(Pin pin) {
        return pin == null ? null : pin.longitude();
    }


    private static Short zoomOf(Pin pin) {
        return pin == null ? null : (short) pin.zoom();
    }


    static Postcard onDay(
            UUID authorId,
            UUID diaryId,
            UUID diaryDayId,
            UUID tripId,
            String dayLabel,
            String place,
            Pin pin,
            String caption,
            Instant at) {
        if (authorId == null || diaryId == null || diaryDayId == null || at == null) {
            throw new IllegalArgumentException(
                    "A day-bound postcard has an author, a diary and the day it sits on");
        }
        requirePlaceFor(pin, place);
        return new Postcard(
                UuidV7.generate(), authorId, diaryId, diaryDayId, tripId, null, null, dayLabel,
                null, place, latitudeOf(pin), longitudeOf(pin), zoomOf(pin), caption, at);
    }


    static Postcard postedFromActivity(
            UUID authorId,
            UUID diaryId,
            UUID diaryDayId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            BigDecimal latitude,
            BigDecimal longitude,
            Short zoom,
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
                diaryDayId,
                tripId,
                activityId,
                activityTitle,
                dayLabel,
                timeOfDay,
                place,
                latitude,
                longitude,
                zoom,
                caption,
                at);
    }


    void fileOn(UUID newDiaryId, UUID newDiaryDayId, Instant at) {
        this.diaryId = newDiaryId;
        this.diaryDayId = newDiaryDayId;
        this.updatedAt = at;
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

    public UUID diaryDayId() {
        return diaryDayId;
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

    public BigDecimal latitude() {
        return latitude;
    }

    public BigDecimal longitude() {
        return longitude;
    }

    public Short zoom() {
        return zoom;
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
