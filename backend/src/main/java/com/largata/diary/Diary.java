package com.largata.diary;

import com.largata.common.id.UuidV7;
import com.largata.diary.DiaryExceptions.DiaryNeedsATitleException;
import com.largata.diary.DiaryExceptions.DiaryTitleTooLongException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "diary")
public class Diary {

    public static final int MAX_TITLE_LENGTH = 120;

    @Id private UUID id;

    @Column(name = "author_id", nullable = false, updatable = false)
    private UUID authorId;

    @Column(name = "trip_id", updatable = false)
    private UUID tripId;

    @Column(nullable = false)
    private String title;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Diary() {}

    private Diary(UUID id, UUID authorId, UUID tripId, String title, Instant at) {
        this.id = id;
        this.authorId = authorId;
        this.tripId = tripId;
        this.title = normalizeTitle(title);
        this.createdAt = at;
        this.updatedAt = at;
    }


    static Diary standalone(UUID authorId, String title, Instant at) {
        if (authorId == null || at == null) {
            throw new IllegalArgumentException("A diary belongs to an author and starts at an instant");
        }
        return new Diary(UuidV7.generate(), authorId, null, title, at);
    }


    static Diary mintedForTrip(UUID authorId, UUID tripId, String title, Instant at) {
        if (authorId == null || tripId == null || at == null) {
            throw new IllegalArgumentException(
                    "A trip diary belongs to an author, tells a trip, and starts at an instant");
        }
        return new Diary(UuidV7.generate(), authorId, tripId, title, at);
    }


    void retitle(String newTitle, Instant at) {
        this.title = normalizeTitle(newTitle);
        this.updatedAt = at;
    }


    boolean isAuthoredBy(UUID candidate) {
        return authorId.equals(candidate);
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

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
