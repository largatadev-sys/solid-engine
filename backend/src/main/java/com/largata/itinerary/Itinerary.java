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
 * way to be born otherwise: lifecycle transitions are explicit acts, so they are explicit methods —
 * {@link #start} and {@link #complete} (S1.7) — never a constructor parameter. Publishing is the same
 * shape and arrives at S4.1 the same way.
 */
@Entity
@Table(name = "itinerary")
public class Itinerary {

    @Id private UUID id;

    /**
     * <strong>{@code updatable = true} since S1.6, and the change is load-bearing.</strong> This was
     * {@code updatable = false} while ownership was immutable (S0.3) — correct then, and a silent trap
     * the moment transfer existed: Hibernate omits a non-updatable column from every UPDATE, so {@link
     * #reassignOwner} mutated the entity, {@code saveAndFlush} reported success, and the column kept
     * the old owner with no error anywhere. Caught by the transfer IT's four-effects assertion; it
     * would otherwise have shipped as a column quietly disagreeing with the membership rows, which is
     * the exact "column that lies" the sync exists to prevent.
     */
    @Column(name = "owner_id", nullable = false)
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

    /** Optional free-text description of the trip (S1.3). Nullable — an itinerary without one is normal. */
    @Column private String description;

    /**
     * Who last edited the itinerary's own fields, and when (S1.3, the last-write-wins attribution
     * half). NULL until the first field edit — a row that predates S1.3, or a freshly-created one that
     * has not been edited, has no editor to name, and NULL says exactly that rather than inventing one.
     * Create does not count as an edit here: the creator is the owner, recorded on the workspace.
     */
    @Column(name = "last_edited_by")
    private UUID lastEditedBy;

    @Column(name = "last_edited_at")
    private Instant lastEditedAt;

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

    /**
     * When the owner started the trip, and when they marked it complete (S1.7) — NULL until each
     * transition happens, which is the honest state for every draft.
     *
     * <p><strong>These record the owner's <em>act</em>, not travel.</strong> {@link #startDate}/{@link
     * #endDate} carry the traveled-when claim; these carry when the system was told. An owner who
     * completes a trip a week late produces a {@code completedAt} after their own {@code endDate}, and
     * that is correct — two different facts, neither derivable from the other.
     *
     * <p><strong>Write-once, structurally.</strong> The state machine is forward-only (02), so {@link
     * #start} and {@link #complete} are each reachable from exactly one state and each state is left
     * exactly once. There is no path back that could re-enter a transition, so neither field can receive
     * a second write — no {@code updatable = false} needed to say so, and the transition guards are what
     * make it true rather than a column annotation. Deliberately not on the wire: no client reads them
     * yet, and adding response fields later is additive (ADR-008).
     */
    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected Itinerary() {
        // JPA.
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

    /** The title's limit, shared with {@code CreateItineraryRequest} so the two cannot drift. */
    public static final int MAX_TITLE_LENGTH = 120;

    /**
     * The description's limit, shared with the DTOs so the two cannot drift (the {@code MAX_TITLE_LENGTH}
     * pattern). Generous — a description is prose, not a label — but bounded, because an unbounded text
     * field is a denial-of-service column waiting to happen.
     */
    public static final int MAX_DESCRIPTION_LENGTH = 4000;

    /**
     * The most days a plan may hold (S1.3, ADR-013) — a year plus a leap day, which is past any real
     * itinerary and a guard against a runaway {@code durationDays}. On the aggregate root, shared with
     * the DTO and {@code DayService}, so the cap is stated once.
     */
    public static final int MAX_DAYS = 366;

    /**
     * A day title's limit (S1.3). Lives on the aggregate root, not on {@code Day}, because the DTO in
     * the {@code .api} package needs it as a compile-time constant and {@code Day} is package-private —
     * the same reason {@code MAX_TITLE_LENGTH} lives here. {@code Day} references it back.
     */
    public static final int MAX_DAY_TITLE_LENGTH = 120;

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
        return draft(ownerId, title, destinations, null, startDate, endDate, createdAt);
    }

    /**
     * Mints a draft itinerary, with an optional description (S1.3). The description-free overload above
     * delegates here — the S0.3 shape is this one with {@code description = null}.
     *
     * @param destinations at least one destination, none of them blank; defensively copied
     * @param description optional free-text; blank collapses to {@code null} (S1.3)
     */
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

    /**
     * Edits the itinerary's own fields (S1.3, ticket 04) — title, destinations, description, dates —
     * and stamps who edited it and when (last-write-wins attribution). Every editable field is
     * replaced at once; there is no per-field patch and no version check, so a later writer silently
     * wins over an earlier one, exactly as {@code Activity.edit} does.
     *
     * <p>The same {@link #validateFields} the factory runs — a create and an edit can never disagree
     * about what a valid itinerary is (the two-door discipline applied to the mutator). Lifecycle,
     * ownership, visibility and existence are <em>not</em> touched here: members shape the plan, only
     * the owner changes those (spec Q8), and each has its own story.
     *
     * @param editor the member making the edit (from the guard's {@code Membership})
     */
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

    /**
     * The field rules shared by create and edit — title present and bounded, at least one non-blank
     * destination, and start ≤ end when both are given (S0.3's date rule, unchanged). Extracted so the
     * factory and {@link #editFields} enforce one definition of validity rather than two that could
     * drift. Domain-side guards; the DTOs mirror them for a clean 400 (the two-door pattern).
     */
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
        // Rejected, not filtered. Silently dropping a blank entry would make this disagree with the
        // DTO — which answers 400 for the same input — and a caller that sent a blank by mistake would
        // have it swallowed rather than reported. The API's contract is "min 1 non-blank".
        if (destinations.stream().anyMatch(d -> d == null || d.isBlank())) {
            throw new IllegalArgumentException("An itinerary's destinations cannot be blank");
        }
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("An itinerary cannot end before it starts");
        }
    }

    /**
     * Blank-or-absent description collapses to {@code null}, and an over-long one is refused — the
     * factory's half of the DTO's rule, so a caller that bypasses the DTO (a fork, an import) cannot
     * plant an empty string that reads as "has a description" or a megabyte of text. The DTO answers
     * 400 for the length; this refuses to construct, for the same reason the destinations rule does.
     */
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

    /**
     * Renames the owner after an ownership transfer (S1.6) — the denormalised half of the swap.
     *
     * <p><strong>This column is a mirror, not the authority.</strong> Authority is the {@code OWNER}
     * membership row, which is what the guard resolves and what INV-4's partial unique index defends;
     * nothing in the request path reads {@code ownerId}. It is kept true anyway because the alternative
     * — freezing it at creation — leaves a column whose name asserts something false, and the next
     * reader (a query, a migration, an engineer) has no way to know. That is the V3 {@code state
     * DEFAULT 'draft'} trap: the quietest possible failure, found by whoever trusts the name next.
     *
     * <p>Package-private, and there is no public setter: ownership moves through {@code
     * ItineraryService.reassignOwner}, called only inside the transfer transaction, so this cannot
     * drift from the membership rows by any other path.
     */
    void reassignOwner(UUID newOwnerId) {
        if (newOwnerId == null) {
            throw new IllegalArgumentException("An itinerary always has an owner — INV-4");
        }
        this.ownerId = newOwnerId;
    }

    /**
     * The trip is underway (S1.7): {@code draft → active}, stamping when the owner said so.
     *
     * <p><strong>Legality lives here, in the aggregate, not in the service.</strong> The service
     * authorizes (owner-only) and the entity decides whether the transition is <em>coherent</em> — the
     * same split as {@link #draft}'s field rules versus the DTO's: a caller that reaches this object by
     * any future path (a fork, an import, a later story) cannot walk the machine backwards or sideways,
     * because the object refuses. The states are the domain's, so the machine belongs to the domain.
     *
     * @throws IllegalStateTransitionException if this itinerary is not a draft
     */
    void start(Instant at) {
        requireState(ItineraryState.DRAFT, ItineraryState.ACTIVE);
        this.state = ItineraryState.ACTIVE;
        this.startedAt = at;
    }

    /**
     * The trip is over (S1.7): {@code active → completed}, stamping when the owner said so.
     *
     * <p><strong>Only from {@code ACTIVE} — there is no skip edge</strong> (spec decision 9). A trip
     * whose travel ended while it was still a draft passes through {@code active} in two deliberate
     * acts. Allowing {@code draft → completed} would mean inventing a {@code startedAt} the owner never
     * supplied, or leaving it NULL on a completed trip and making "was this trip ever started?"
     * unanswerable — the machine would stop meaning "the phases every trip passes through".
     *
     * <p><strong>Forward-only: there is no {@code uncomplete}.</strong> Canon's illegal list (02) holds,
     * and the absence of a method is how this object says so. The mis-tap guard is the client's confirm
     * dialog, not a reversal here.
     *
     * @throws IllegalStateTransitionException if this itinerary is not active
     */
    void complete(Instant at) {
        requireState(ItineraryState.ACTIVE, ItineraryState.COMPLETED);
        this.state = ItineraryState.COMPLETED;
        this.completedAt = at;
    }

    /**
     * The one legality check both transitions share — refuse unless the itinerary is in the state the
     * edge leaves from. Extracted so the two transitions cannot drift into two different ideas of what
     * "illegal" means, and so the refusal always names both ends of the edge it refused.
     */
    private void requireState(ItineraryState required, ItineraryState target) {
        if (this.state != required) {
            throw new IllegalStateTransitionException(this.state, target);
        }
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

    /** When the owner started the trip — NULL while it is still a draft (S1.7). */
    public Instant startedAt() {
        return startedAt;
    }

    /** When the owner marked the trip complete — NULL until they do (S1.7). */
    public Instant completedAt() {
        return completedAt;
    }
}
