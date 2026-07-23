package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One ordinal slot of a day-indexed plan (02-domain-model, ADR-013): Day 1..N, optionally titled.
 *
 * <p><strong>A child of the Itinerary aggregate</strong> — not a standalone thing. It carries an
 * {@code itineraryId} (a UUID, not an {@code Itinerary}: same-module, but the aggregate root is
 * referenced by id like everything else, so a Day never drags a whole itinerary into its object
 * graph), and its lifecycle is the plan's: created when the plan gains a day, renumbered when a
 * sibling is deleted, gone when the itinerary is (V7's {@code ON DELETE CASCADE}).
 *
 * <p><strong>Ordinal is mutable, and that is the point of the type.</strong> Most entities in this
 * codebase are write-once; a Day's {@code ordinal} changes when a lower-numbered day is deleted and
 * the plan renumbers to stay contiguous (ADR-013). The mutators are package-private — only {@link
 * DayService}, which owns the contiguity invariant, ever calls them. The title is editable for the
 * same in-module-only reason.
 *
 * <p>Package-private, like the workspace's {@code Membership} and {@code Workspace}: everything
 * outside the itinerary module reaches days through {@link ItineraryService} (ADR-002).
 */
@Entity
@Table(name = "day")
class Day {

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;

    /**
     * The day's position, 1..N, contiguous (ADR-013). Not {@code updatable = false}: a renumber after
     * a sibling delete is exactly an ordinal change, and V7's {@code UNIQUE (itinerary_id, ordinal)}
     * makes a botched renumber fail loudly rather than plant two Day-3s.
     */
    @Column(nullable = false)
    private int ordinal;

    /** Optional day title ("Arrival & Sunsets") — the field that forced Day to be an entity (ADR-013). */
    @Column private String title;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Day() {
        // JPA.
    }

    private Day(UUID id, UUID itineraryId, int ordinal, String title, Instant createdAt) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.ordinal = ordinal;
        this.title = title;
        this.createdAt = createdAt;
    }

    /**
     * A day title's limit — {@link Itinerary#MAX_DAY_TITLE_LENGTH}, referenced back so the value lives
     * in one place (the DTO reads it from {@code Itinerary}, which is public; this class is not).
     */
    static final int MAX_TITLE_LENGTH = Itinerary.MAX_DAY_TITLE_LENGTH;

    /**
     * Mints a day at a given ordinal for an itinerary. Blank titles collapse to {@code null} (an empty
     * title is "no title", not a title that is the empty string); an over-long one is refused, the
     * factory's half of the DTO rule.
     */
    static Day at(UUID itineraryId, int ordinal, String title, Instant createdAt) {
        if (itineraryId == null || createdAt == null) {
            throw new IllegalArgumentException("A day belongs to an itinerary and is created at an instant");
        }
        if (ordinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        return new Day(UuidV7.generate(), itineraryId, ordinal, normalizeTitle(title), createdAt);
    }

    /** Renames the day; blank collapses to {@code null}. In-module only (DayService). */
    void rename(String newTitle) {
        this.title = normalizeTitle(newTitle);
    }

    /** Moves the day to a new ordinal — the renumber after a sibling delete. In-module only (DayService). */
    void renumberTo(int newOrdinal) {
        if (newOrdinal < 1) {
            throw new IllegalArgumentException("A day's ordinal starts at 1");
        }
        this.ordinal = newOrdinal;
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
