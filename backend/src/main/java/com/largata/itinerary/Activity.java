package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

/**
 * One element of a Day's plan (02-domain-model, ADR-013): transport, meal, stay, sight — anything
 * scheduled. The name reads narrower than it means, deliberately, and permanently within /v1.
 *
 * <p><strong>A child of the Itinerary aggregate, hung off a {@link Day}.</strong> It carries a {@code
 * dayId} (a UUID — same-aggregate, but referenced by id like everything else); its lifecycle is the
 * day's (V7's {@code ON DELETE CASCADE} takes it when the day goes), and a cross-day move (ticket 03)
 * is an update of {@code dayId}.
 *
 * <p><strong>Last-write-wins, whole-entity (2026-07-17 ruling, spec §mechanics).</strong> {@link
 * #edit} replaces every editable field at once and restamps attribution; there is no per-field patch
 * and no version check, so a later writer silently wins over an earlier one. That is the ruling, not
 * an omission — locking and edit history are post-gate.
 *
 * <p><strong>Estimated cost is planning money, never ledger money</strong> (Artifact 02, spec
 * §boundary): {@code costAmount}/{@code costCurrency} feed no balance and no INV-7/8 path. A {@code
 * null} amount is "unstated"; a zero amount is "Free" — a real, different fact, which is why the
 * column is nullable rather than defaulted to zero. The two travel together: both null or both set
 * (an amount without a currency is a number without units), enforced by {@link ActivityFields}.
 *
 * <p>Package-private (ADR-002): reached through {@link ItineraryService}.
 */
@Entity
@Table(name = "activity")
class Activity {

    @Id private UUID id;

    /**
     * The day this activity belongs to. Not {@code updatable = false}: a cross-day move (ticket 03)
     * reassigns it. Same aggregate, referenced by id.
     */
    @Column(name = "day_id", nullable = false)
    private UUID dayId;

    /**
     * Manual sort order within the day, AUTHORITATIVE (ADR-013) — a typed {@link #timeOfDay} never
     * overrides it. Ticket 03 owns reorder; create assigns end-of-day. Mutable (reorder is an update).
     */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private String title;

    /** Optional local time-of-day, timezone-free (ADR-013). Display metadata, never a sort key. */
    @Column(name = "time_of_day")
    private LocalTime timeOfDay;

    /** Optional estimated cost amount — planning money. {@code null} = unstated, zero = "Free". */
    @Column(name = "cost_amount")
    private BigDecimal costAmount;

    /** ISO-4217 currency code paired with {@link #costAmount}; {@code null} exactly when the amount is. */
    @Column(name = "cost_currency")
    private String costCurrency;

    /** Free-text place, not a geotag (ADR-013). */
    @Column private String place;

    @Column private String description;

    /** Private planning notes — publish-time disposition is S4.1's (spec §fields). */
    @Column private String notes;

    /** One external URL — the E1 baseline and E6's unfurl target, singular (spec §links). */
    @Column(name = "external_url")
    private String externalUrl;

    /**
     * Who last edited this activity, and when (S1.3 attribution). Set on every write including create,
     * so an activity is never un-attributed — the one column whose deferral would destroy data
     * retroactively (spec Q7). Mutable: every edit restamps it.
     */
    @Column(name = "last_edited_by", nullable = false)
    private UUID lastEditedBy;

    @Column(name = "last_edited_at", nullable = false)
    private Instant lastEditedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Activity() {
        // JPA.
    }

    private Activity(UUID id, UUID dayId, int sortOrder, ActivityFields fields, UUID editor, Instant at) {
        this.id = id;
        this.dayId = dayId;
        this.sortOrder = sortOrder;
        this.createdAt = at;
        apply(fields, editor, at);
    }

    /**
     * Mints an activity at a given sort position on a day, attributed to its creator (S1.3).
     *
     * <p>Create is a write like any other: it stamps {@code last_edited_by/at} from the outset, so an
     * activity is never un-attributed (spec Q7). The fields are validated once, in {@link
     * ActivityFields}, which both this and {@link #edit} route through — so a create and an edit can
     * never disagree about what a valid activity is.
     *
     * @param editor the member creating it (from the guard's {@code Membership})
     * @param sortOrder the position within the day — the service assigns end-of-day (ticket 02);
     *     reorder mechanics are ticket 03
     */
    static Activity create(UUID dayId, int sortOrder, ActivityFields fields, UUID editor, Instant at) {
        if (dayId == null || fields == null || editor == null || at == null) {
            throw new IllegalArgumentException("An activity belongs to a day, has fields, an editor and an instant");
        }
        return new Activity(UuidV7.generate(), dayId, sortOrder, fields, editor, at);
    }

    /**
     * Replaces every editable field and restamps attribution (S1.3, last-write-wins). The sort order
     * and the day are not touched here — reorder and cross-day move are their own operations (ticket
     * 03) — so an edit is exactly "the content changed", nothing about position.
     */
    void edit(ActivityFields fields, UUID editor, Instant at) {
        apply(fields, editor, at);
    }

    /** Moves the activity to another day (ticket 03's cross-day move); in-module only. */
    void moveToDay(UUID newDayId, int newSortOrder) {
        this.dayId = newDayId;
        this.sortOrder = newSortOrder;
    }

    /** Sets the sort position (ticket 03's reorder); in-module only. */
    void reorderTo(int newSortOrder) {
        this.sortOrder = newSortOrder;
    }

    private void apply(ActivityFields fields, UUID editor, Instant at) {
        this.title = fields.title();
        this.timeOfDay = fields.timeOfDay();
        this.costAmount = fields.costAmount();
        this.costCurrency = fields.costCurrency();
        this.place = fields.place();
        this.description = fields.description();
        this.notes = fields.notes();
        this.externalUrl = fields.externalUrl();
        this.lastEditedBy = editor;
        this.lastEditedAt = at;
    }

    UUID id() {
        return id;
    }

    UUID dayId() {
        return dayId;
    }

    int sortOrder() {
        return sortOrder;
    }

    String title() {
        return title;
    }

    LocalTime timeOfDay() {
        return timeOfDay;
    }

    BigDecimal costAmount() {
        return costAmount;
    }

    String costCurrency() {
        return costCurrency;
    }

    String place() {
        return place;
    }

    String description() {
        return description;
    }

    String notes() {
        return notes;
    }

    String externalUrl() {
        return externalUrl;
    }

    UUID lastEditedBy() {
        return lastEditedBy;
    }

    Instant lastEditedAt() {
        return lastEditedAt;
    }

    Instant createdAt() {
        return createdAt;
    }
}
