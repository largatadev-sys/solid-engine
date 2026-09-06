package com.largata.diary;

import com.largata.common.id.UuidV7;
import com.largata.diary.DiaryExceptions.DiaryEndsBeforeItStartsException;
import com.largata.diary.DiaryExceptions.DiaryNeedsATitleException;
import com.largata.diary.DiaryExceptions.DiaryNeedsItsDatesException;
import com.largata.diary.DiaryExceptions.DiaryTitleTooLongException;
import com.largata.diary.DiaryExceptions.DiaryTooLongException;
import com.largata.diary.DiaryExceptions.DiaryHasNotHappenedYetException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "diary")
public class Diary {

    public static final int MAX_TITLE_LENGTH = 120;
    public static final int MAX_DAYS = 365;

    @Id private UUID id;

    @Column(name = "author_id", nullable = false, updatable = false)
    private UUID authorId;

    @Column(name = "trip_id", updatable = false)
    private UUID tripId;

    @Column(nullable = false)
    private String title;

    @Column private String destination;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Diary() {}

    private Diary(
            UUID id,
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            Instant at) {
        this.id = id;
        this.authorId = authorId;
        this.tripId = tripId;
        this.title = normalizeTitle(title);
        this.destination = normalize(destination);
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = at;
        this.updatedAt = at;
    }


    static Diary standalone(
            UUID authorId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            Instant at) {
        if (authorId == null || at == null) {
            throw new IllegalArgumentException("A diary belongs to an author and starts at an instant");
        }
        requireSaneRange(startDate, endDate, at);
        return new Diary(
                UuidV7.generate(), authorId, null, title, destination, startDate, endDate, at);
    }


    static Diary mintedForTrip(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            Instant at) {
        if (authorId == null || tripId == null || at == null) {
            throw new IllegalArgumentException(
                    "A trip diary belongs to an author, tells a trip, and starts at an instant");
        }
        LocalDate start =
                startDate == null ? LocalDate.ofInstant(at, java.time.ZoneOffset.UTC) : startDate;
        LocalDate end = endDate == null || endDate.isBefore(start) ? start : endDate;
        return new Diary(UuidV7.generate(), authorId, tripId, title, destination, start, end, at);
    }


    void coverDay(int ordinal, Instant at) {
        LocalDate needed = startDate.plusDays(ordinal - 1L);
        if (needed.isAfter(endDate)) {
            this.endDate = needed;
            this.updatedAt = at;
        }
    }


    void describe(
            String newTitle,
            String newDestination,
            LocalDate newStart,
            LocalDate newEnd,
            Instant at) {
        requireSaneRange(newStart, newEnd, at);
        this.title = normalizeTitle(newTitle);
        this.destination = normalize(newDestination);
        this.startDate = newStart;
        this.endDate = newEnd;
        this.updatedAt = at;
    }


    void widenTo(LocalDate date, Instant at) {
        if (date.isBefore(startDate)) {
            this.startDate = date;
            this.updatedAt = at;
        }
        if (date.isAfter(endDate)) {
            this.endDate = date;
            this.updatedAt = at;
        }
    }


    void touch(Instant at) {
        this.updatedAt = at;
    }


    int ordinalOf(LocalDate date) {
        return (int) ChronoUnit.DAYS.between(startDate, date) + 1;
    }


    List<LocalDate> candidateDates() {
        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            dates.add(date);
        }
        return dates;
    }


    boolean isAuthoredBy(UUID candidate) {
        return authorId.equals(candidate);
    }


    private static void requireSaneRange(LocalDate startDate, LocalDate endDate, Instant at) {
        if (startDate == null || endDate == null) {
            throw new DiaryNeedsItsDatesException();
        }
        if (endDate.isBefore(startDate)) {
            throw new DiaryEndsBeforeItStartsException();
        }
        if (startDate.isAfter(LocalDate.ofInstant(at, java.time.ZoneOffset.UTC))) {
            throw new DiaryHasNotHappenedYetException();
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) + 1 > MAX_DAYS) {
            throw new DiaryTooLongException(MAX_DAYS);
        }
    }


    static String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new DiaryNeedsATitleException();
        }
        String stripped = title.strip();
        if (stripped.length() > MAX_TITLE_LENGTH) {
            throw new DiaryTitleTooLongException(MAX_TITLE_LENGTH);
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

    public UUID tripId() {
        return tripId;
    }

    public String title() {
        return title;
    }

    public String destination() {
        return destination;
    }

    public LocalDate startDate() {
        return startDate;
    }

    public LocalDate endDate() {
        return endDate;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
