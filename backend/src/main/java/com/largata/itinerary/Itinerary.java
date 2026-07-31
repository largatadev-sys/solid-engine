package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


@Entity
@Table(name = "itinerary")
public class Itinerary {

    @Id private UUID id;


    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String title;


    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> destinations;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;


    @Column private String description;


    @Column(name = "last_edited_by")
    private UUID lastEditedBy;

    @Column(name = "last_edited_at")
    private Instant lastEditedAt;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItineraryState state;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected Itinerary() {
    }

    private Itinerary(
            UUID id,
            UUID ownerId,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.title = title;
        this.destinations = destinations;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.state = ItineraryState.DRAFT;
        this.visibility = Visibility.PRIVATE;
        this.createdAt = createdAt;
    }


    public static final int MAX_TITLE_LENGTH = 120;


    public static final int MAX_DESCRIPTION_LENGTH = 4000;


    public static final int MAX_DAYS = 366;


    public static final int MAX_DAY_TITLE_LENGTH = 120;


    static Itinerary draft(
            UUID ownerId,
            String title,
            List<String> destinations,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        return draft(ownerId, title, destinations, null, startDate, endDate, createdAt);
    }


    static Itinerary draft(
            UUID ownerId,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        validateFields(title, destinations, startDate, endDate);
        return new Itinerary(
                UuidV7.generate(),
                ownerId,
                title.strip(),
                destinations.stream().map(String::strip).toList(),
                normalizeDescription(description),
                startDate,
                endDate,
                createdAt);
    }


    void editFields(
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            UUID editor,
            Instant at) {
        validateFields(title, destinations, startDate, endDate);
        this.title = title.strip();
        this.destinations = destinations.stream().map(String::strip).toList();
        this.description = normalizeDescription(description);
        this.startDate = startDate;
        this.endDate = endDate;
        this.lastEditedBy = editor;
        this.lastEditedAt = at;
    }


    private static void validateFields(
            String title, List<String> destinations, LocalDate startDate, LocalDate endDate) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("An itinerary needs a title");
        }
        if (title.strip().length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("An itinerary's title is at most " + MAX_TITLE_LENGTH + " characters");
        }
        if (destinations == null || destinations.isEmpty()) {
            throw new IllegalArgumentException("An itinerary needs at least one destination");
        }
        if (destinations.stream().anyMatch(d -> d == null || d.isBlank())) {
            throw new IllegalArgumentException("An itinerary's destinations cannot be blank");
        }
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("An itinerary cannot end before it starts");
        }
    }


    private static String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        String stripped = description.strip();
        if (stripped.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException(
                    "An itinerary's description is at most " + MAX_DESCRIPTION_LENGTH + " characters");
        }
        return stripped;
    }


    void reassignOwner(UUID newOwnerId) {
        if (newOwnerId == null) {
            throw new IllegalArgumentException("An itinerary always has an owner — INV-4");
        }
        this.ownerId = newOwnerId;
    }


    void start(Instant at) {
        requireState(ItineraryState.DRAFT, ItineraryState.ACTIVE);
        this.state = ItineraryState.ACTIVE;
        this.startedAt = at;
    }


    void complete(Instant at) {
        requireState(ItineraryState.ACTIVE, ItineraryState.COMPLETED);
        this.state = ItineraryState.COMPLETED;
        this.completedAt = at;
    }


    private void requireState(ItineraryState required, ItineraryState target) {
        if (this.state != required) {
            throw new IllegalStateTransitionException(this.state, target);
        }
    }


    void publish() {
        this.visibility = Visibility.PUBLISHED;
    }


    void unpublish() {
        this.visibility = Visibility.PRIVATE;
    }

    public UUID id() {
        return id;
    }

    public UUID ownerId() {
        return ownerId;
    }

    public String title() {
        return title;
    }


    public List<String> destinations() {
        return List.copyOf(destinations);
    }

    public String description() {
        return description;
    }

    public LocalDate startDate() {
        return startDate;
    }

    public LocalDate endDate() {
        return endDate;
    }

    public UUID lastEditedBy() {
        return lastEditedBy;
    }

    public Instant lastEditedAt() {
        return lastEditedAt;
    }

    public ItineraryState state() {
        return state;
    }

    public Visibility visibility() {
        return visibility;
    }

    public Instant createdAt() {
        return createdAt;
    }


    public Instant startedAt() {
        return startedAt;
    }


    public Instant completedAt() {
        return completedAt;
    }
}
