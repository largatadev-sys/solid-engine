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

/**
 * The plan (02-domain-model): a standalone, forkable, publishable object, and the root of the
 * Itinerary aggregate.
 *
 * <p>S0.3 builds the root alone. Items, fork lineage and the published aggregate cost are all part
 * of this aggregate by design but arrive with their own stories (S1.3, S4.7, S5.4) — additively,
 * because nothing here has to change to admit them.
 *
 * <p><strong>{@code ownerId} is a UUID, not a {@code Traveler}.</strong> Modules reference each
 * other by ID and service interface only (ADR-002); a JPA association would put the identity
 * module's entity inside this one's object graph and make the two inseparable. The id is the whole
 * reference this aggregate needs.
 *
 * <p><strong>Every itinerary is born {@code DRAFT}/{@code PRIVATE}</strong> and this class offers no
 * way to be born otherwise: publishing and lifecycle transitions are later stories' explicit acts,
 * so they get explicit methods when they arrive, not a constructor parameter now.
 */
@Entity
@Table(name = "itinerary")
public class Itinerary {

    @Id private UUID id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(nullable = false)
    private String title;

    /**
     * Hibernate maps {@code List<String>} to a Postgres {@code text[]} given the explicit JDBC type
     * code; without it, the default is to serialize the list into a single opaque column value —
     * queryable by nothing, which is the wrong shape for a field E4 may search.
     */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> destinations;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * {@code EnumType.STRING}, never {@code ORDINAL}: the ordinal form stores a position, so
     * inserting a state into the middle of the enum later would silently reinterpret every existing
     * row. The column holds the name the domain uses.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItineraryState state;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Itinerary() {
        // JPA.
    }

    private Itinerary(
            UUID id,
            UUID ownerId,
            String title,
            List<String> destinations,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        this.id = id;
        this.ownerId = ownerId;
        this.title = title;
        this.destinations = destinations;
        this.startDate = startDate;
        this.endDate = endDate;
        this.state = ItineraryState.DRAFT;
        this.visibility = Visibility.PRIVATE;
        this.createdAt = createdAt;
    }

    /** The title's limit, shared with {@code CreateItineraryRequest} so the two cannot drift. */
    public static final int MAX_TITLE_LENGTH = 120;

    /**
     * Mints a draft itinerary for its creator. The id is generated here, app-side, so it exists
     * before persistence (S0.1).
     *
     * <p>The guards below are the domain's, not the API's — {@code CreateItineraryRequest} validates
     * the same rules at the boundary, where a violation can be a good 400 instead of a 500. This
     * factory is what makes those states <em>unrepresentable</em>: a caller that never sees the DTO
     * (S4.7's fork, a future import) cannot construct one by forgetting. Bean Validation protects one
     * door; a factory that refuses protects the type. Every rule the DTO states is therefore stated
     * here too — the set must match exactly, or the door the DTO guards is the only one guarded.
     *
     * @param destinations at least one destination, none of them blank; defensively copied
     */
    static Itinerary draft(
            UUID ownerId,
            String title,
            List<String> destinations,
            LocalDate startDate,
            LocalDate endDate,
            Instant createdAt) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("An itinerary needs a title");
        }
        if (title.strip().length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("An itinerary's title is at most " + MAX_TITLE_LENGTH + " characters");
        }
        if (destinations == null || destinations.isEmpty()) {
            throw new IllegalArgumentException("An itinerary needs at least one destination");
        }
        // Rejected, not filtered. Silently dropping a blank entry would make this factory disagree
        // with the DTO — which answers 400 for the same input — and a caller that sent a blank by
        // mistake would have it swallowed rather than reported. The API's contract is "min 1
        // non-blank"; a quiet filter is a different, weaker contract wearing the same words.
        if (destinations.stream().anyMatch(d -> d == null || d.isBlank())) {
            throw new IllegalArgumentException("An itinerary's destinations cannot be blank");
        }
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("An itinerary cannot end before it starts");
        }
        return new Itinerary(
                UuidV7.generate(),
                ownerId,
                title.strip(),
                destinations.stream().map(String::strip).toList(),
                startDate,
                endDate,
                createdAt);
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

    /** Defensively copied: the aggregate's own list is not a handle for callers to mutate. */
    public List<String> destinations() {
        return List.copyOf(destinations);
    }

    public LocalDate startDate() {
        return startDate;
    }

    public LocalDate endDate() {
        return endDate;
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
}
