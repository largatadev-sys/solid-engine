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


    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> standouts;


    @Column(name = "best_time_of_year")
    private String bestTimeOfYear;


    @Column(name = "cover_image_url")
    private String coverImageUrl;


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

    @Column(nullable = false)
    private boolean published;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected Itinerary() {
    }

    private Itinerary(UUID id, UUID ownerId, ItineraryFields fields, Instant createdAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.state = ItineraryState.DRAFT;
        this.visibility = Visibility.PUBLIC;
        this.published = false;
        this.createdAt = createdAt;
        apply(fields);
    }


    private void apply(ItineraryFields fields) {
        this.title = fields.title();
        this.destinations = fields.destinations();
        this.description = fields.description();
        this.startDate = fields.startDate();
        this.endDate = fields.endDate();

        if (fields.standouts() != null) {
            this.standouts = fields.standouts();
        }
        if (fields.bestTimeOfYear() != null) {
            this.bestTimeOfYear = fields.bestTimeOfYear().isEmpty() ? null : fields.bestTimeOfYear();
        }
    }


    public static final int MAX_TITLE_LENGTH = 120;


    public static final int MAX_DESCRIPTION_LENGTH = 4000;


    public static final int MAX_DAYS = 366;


    public static final int MAX_DAY_TITLE_LENGTH = 120;


    public static final int MAX_STANDOUTS = 12;


    public static final int MAX_STANDOUT_LENGTH = 120;


    public static final int MAX_BEST_TIME_LENGTH = 60;


    static Itinerary draft(
            UUID ownerId,
            String title,
            List<String> destinations,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        return draft(ownerId, title, destinations, null, startDate, endDate, createdAt);
    }


    static Itinerary draft(UUID ownerId, ItineraryFields fields, Instant createdAt) {
        return new Itinerary(UuidV7.generate(), ownerId, fields, createdAt);
    }


    static Itinerary draft(
            UUID ownerId,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        return new Itinerary(
                UuidV7.generate(),
                ownerId,
                ItineraryFields.withoutPublishMetadata(title, destinations, description, startDate, endDate),
                createdAt);
    }


    void editFields(ItineraryFields fields, UUID editor, Instant at) {
        apply(fields);
        this.lastEditedBy = editor;
        this.lastEditedAt = at;
    }


    void reassignOwner(UUID newOwnerId) {
        if (newOwnerId == null) {
            throw new IllegalArgumentException("An itinerary always has an owner — INV-4");
        }
        this.ownerId = newOwnerId;
    }


    void finishPlanning() {
        requireState(ItineraryState.DRAFT, ItineraryState.UPCOMING);
        this.state = ItineraryState.UPCOMING;
    }


    void start(Instant at) {
        requireState(ItineraryState.UPCOMING, ItineraryState.ONGOING);
        this.state = ItineraryState.ONGOING;
        this.startedAt = at;
    }


    void complete(Instant at) {
        requireState(ItineraryState.ONGOING, ItineraryState.COMPLETED);
        this.state = ItineraryState.COMPLETED;
        this.completedAt = at;
    }


    void reopen() {
        ItineraryState target = state.previous().orElseThrow(
                () -> new IllegalStateTransitionException(state, state));
        requireUnpublished(target);
        switch (target) {
            case ONGOING -> this.completedAt = null;
            case UPCOMING -> this.startedAt = null;
            case DRAFT -> { }
            case COMPLETED -> throw new IllegalStateTransitionException(state, target);
        }
        this.state = target;
    }


    private void requireState(ItineraryState required, ItineraryState target) {
        requireUnpublished(target);
        if (this.state != required) {
            throw new IllegalStateTransitionException(this.state, target);
        }
    }


    private void requireUnpublished(ItineraryState target) {
        if (published) {
            throw new IllegalStateTransitionException(state, target);
        }
    }


    void publishTo(Visibility audience) {
        if (!state.admitsPublishing()) {
            throw new NotCompleteException(state);
        }
        this.visibility = audience;
        this.published = true;
    }


    void showTo(Visibility audience) {
        this.visibility = audience;
    }


    void unpublish() {
        this.published = false;
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


    public List<String> standouts() {
        return List.copyOf(standouts);
    }


    public String bestTimeOfYear() {
        return bestTimeOfYear;
    }


    public String coverImageUrl() {
        return coverImageUrl;
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


    public boolean isPublished() {
        return published;
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
