package com.largata.diary;

import com.largata.common.id.UuidV7;
import com.largata.diary.DiaryExceptions.DiaryDayNeedsADateException;
import com.largata.diary.DiaryExceptions.DiaryDayPlaceTooLongException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;


@Entity
@Table(name = "diary_day")
public class DiaryDay {

    public static final int MAX_PLACE_LENGTH = 200;

    @Id private UUID id;

    @Column(name = "diary_id", nullable = false, updatable = false)
    private UUID diaryId;

    @Column(nullable = false, updatable = false)
    private int ordinal;

    @Column(nullable = false, updatable = false)
    private LocalDate date;

    @Column private String place;

    @Column(name = "trip_day_id", updatable = false)
    private UUID tripDayId;

    @Column(name = "trip_day_title", updatable = false)
    private String tripDayTitle;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DiaryDay() {}

    private DiaryDay(
            UUID id,
            UUID diaryId,
            int ordinal,
            LocalDate date,
            String place,
            UUID tripDayId,
            String tripDayTitle,
            Instant at) {
        this.id = id;
        this.diaryId = diaryId;
        this.ordinal = ordinal;
        this.date = date;
        this.place = normalizePlace(place);
        this.tripDayId = tripDayId;
        this.tripDayTitle = tripDayTitle;
        this.createdAt = at;
        this.updatedAt = at;
    }


    static DiaryDay on(UUID diaryId, int ordinal, LocalDate date, String place, Instant at) {
        if (diaryId == null || at == null) {
            throw new IllegalArgumentException("A day belongs to a diary and starts at an instant");
        }
        if (date == null) {
            throw new DiaryDayNeedsADateException();
        }
        return new DiaryDay(UuidV7.generate(), diaryId, ordinal, date, place, null, null, at);
    }


    static DiaryDay snapshotOfTripDay(
            UUID diaryId,
            int ordinal,
            LocalDate date,
            String place,
            UUID tripDayId,
            String tripDayTitle,
            Instant at) {
        if (diaryId == null || tripDayId == null || date == null || at == null) {
            throw new IllegalArgumentException(
                    "A derived day belongs to a diary, snapshots a trip day, and has a date");
        }
        return new DiaryDay(
                UuidV7.generate(), diaryId, ordinal, date, place, tripDayId, tripDayTitle, at);
    }


    void moveTo(String newPlace, Instant at) {
        this.place = normalizePlace(newPlace);
        this.updatedAt = at;
    }


    private static String normalizePlace(String place) {
        if (place == null || place.isBlank()) {
            return null;
        }
        String stripped = place.strip();
        if (stripped.length() > MAX_PLACE_LENGTH) {
            throw new DiaryDayPlaceTooLongException(MAX_PLACE_LENGTH);
        }
        return stripped;
    }


    public UUID id() {
        return id;
    }

    public UUID diaryId() {
        return diaryId;
    }

    public int ordinal() {
        return ordinal;
    }

    public LocalDate date() {
        return date;
    }

    public String place() {
        return place;
    }

    public UUID tripDayId() {
        return tripDayId;
    }

    public String tripDayTitle() {
        return tripDayTitle;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
