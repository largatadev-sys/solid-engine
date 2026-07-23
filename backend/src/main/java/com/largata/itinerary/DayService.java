package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Day child's operations within the Itinerary aggregate (S1.3, ADR-013).
 *
 * <p><strong>Every mutator takes a {@link Membership}, not a traveler id</strong> — the same
 * structural guarantee {@link ItineraryService#view} turns on: a day cannot be created, renamed or
 * deleted by a handler that has not been through the guard. And it is a {@code Membership} of *any*
 * role, because S1.3's ruling is that <em>members shape the plan</em> (spec Q8): building days is
 * collaboration, not an owner-only act, so nothing here reads {@code isOwner()}.
 *
 * <p><strong>Contiguity is this service's invariant to keep</strong> (ADR-013): days are 1..N with no
 * gaps. Append takes {@code count + 1}; delete renumbers every later day down by one. V7's {@code
 * UNIQUE (itinerary_id, ordinal)} is the backstop that turns a renumber bug into a loud failure
 * rather than a plan with two Day-3s.
 *
 * <p>A separate collaborator from {@link ItineraryService} so the root's service stays focused, but
 * the same module — days are aggregate-internal, so this never crosses a module boundary.
 */
@Service
public class DayService {

    private static final Logger log = LoggerFactory.getLogger(DayService.class);

    private final DayRepository days;
    private final ActivityRepository activities;
    private final Analytics analytics;

    @PersistenceContext private EntityManager entityManager;

    DayService(DayRepository days, ActivityRepository activities, Analytics analytics) {
        this.days = days;
        this.activities = activities;
        this.analytics = analytics;
    }

    /**
     * Mints {@code count} contiguous days (ordinals 1..count) for a just-created itinerary — the
     * {@code durationDays} the create flow passes.
     *
     * <p>{@link Propagation#MANDATORY}: this only ever runs inside {@code ItineraryService.create}'s
     * transaction, forming the plan skeleton in the same breath as the itinerary and its workspace.
     * {@code count == 0} is valid and common — an itinerary with no duration yet — and writes nothing.
     *
     * @param count how many days to mint; {@code 0} for an undated skeleton, capped at {@link Itinerary#MAX_DAYS}
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void seedDays(UUID itineraryId, int count, Instant createdAt) {
        if (count < 0) {
            throw new IllegalArgumentException("An itinerary cannot have a negative number of days");
        }
        if (count > Itinerary.MAX_DAYS) {
            throw new IllegalArgumentException("An itinerary has at most " + Itinerary.MAX_DAYS + " days");
        }
        for (int ordinal = 1; ordinal <= count; ordinal++) {
            days.save(Day.at(itineraryId, ordinal, null, createdAt));
        }
        if (count > 0) {
            log.info("Days seeded: itineraryId={} count={}", itineraryId, count);
        }
    }

    /**
     * A plan's days in order, each with its activities nested in manual order (ADR-013) — the tree
     * {@link ItineraryService#view} embeds in the itinerary response.
     *
     * <p>One query per day for its activities: a plan has a handful of days, so this is a handful of
     * indexed reads, not the N+1 that phrase usually warns about. A single join-fetch would be the
     * optimisation to reach for only if a plan ever grew large enough to feel it — it will not
     * ({@link Itinerary#MAX_DAYS} caps it, and activities-per-day is small), so the simpler shape wins.
     */
    @Transactional(readOnly = true)
    public List<DayView> plan(UUID itineraryId) {
        return days.findByItineraryIdOrderByOrdinalAsc(itineraryId).stream()
                .map(day -> DayView.of(day, activities.findByDayIdOrderBySortOrderAscIdAsc(day.id())))
                .toList();
    }

    /**
     * Appends a day to the plan, at the next ordinal (S1.3). Any member.
     *
     * @return the new day
     */
    @Transactional
    public DayView appendDay(Membership member, String title) {
        UUID itineraryId = member.itineraryId();
        long existing = days.countByItineraryId(itineraryId);
        if (existing >= Itinerary.MAX_DAYS) {
            // A cap a real client can hit → a clean 400, not the 500 a raw IllegalArgumentException
            // would become (see PlanLimitExceededException).
            throw new PlanLimitExceededException("An itinerary has at most " + Itinerary.MAX_DAYS + " days");
        }
        int ordinal = (int) existing + 1;
        Day day = days.save(Day.at(itineraryId, ordinal, title, Instant.now()));
        log.info("Day appended: itineraryId={} dayId={} ordinal={}", itineraryId, day.id(), ordinal);
        emit(member, "day_added", itineraryId);
        // A just-appended day has no activities yet — an empty list, not a query.
        return DayView.of(day, List.of());
    }

    /** Renames a day (S1.3). Any member. 404-masks a day of another plan. */
    @Transactional
    public DayView renameDay(Membership member, UUID dayId, String title) {
        Day day = require(member.itineraryId(), dayId);
        day.rename(title);
        days.save(day);
        log.info("Day renamed: itineraryId={} dayId={}", member.itineraryId(), dayId);
        return DayView.of(day, activities.findByDayIdOrderBySortOrderAscIdAsc(day.id()));
    }

    /**
     * Deletes a day and renumbers the rest to stay contiguous (S1.3, ADR-013). Any member.
     *
     * <p>The day's activities go with it (V7's {@code ON DELETE CASCADE}). Then every day above the
     * hole drops one ordinal, so 1,2,~~3~~,4,5 becomes 1,2,3,4. <strong>The order of operations
     * matters:</strong> the delete is flushed before the renumber, so the vacated ordinal is free
     * when the day above it moves down into it — otherwise the first renumber UPDATE would collide
     * with the not-yet-deleted row on {@code UNIQUE (itinerary_id, ordinal)}.
     */
    @Transactional
    public void deleteDay(Membership member, UUID dayId) {
        UUID itineraryId = member.itineraryId();
        Day day = require(itineraryId, dayId);
        int removedOrdinal = day.ordinal();

        days.delete(day);
        // Flush the delete so its ordinal is vacated before any surviving day moves into it — the
        // UNIQUE (itinerary_id, ordinal) constraint would otherwise reject the first renumber UPDATE
        // against the row we have scheduled for deletion but not yet flushed.
        entityManager.flush();

        List<Day> toRenumber =
                days.findByItineraryIdOrderByOrdinalAsc(itineraryId).stream()
                        .filter(d -> d.ordinal() > removedOrdinal)
                        .toList();
        for (Day above : toRenumber) {
            above.renumberTo(above.ordinal() - 1);
            days.save(above);
        }
        log.info("Day deleted: itineraryId={} dayId={} renumbered={}", itineraryId, dayId, toRenumber.size());
        emit(member, "day_removed", itineraryId);
    }

    private Day require(UUID itineraryId, UUID dayId) {
        return days.findByIdAndItineraryId(dayId, itineraryId).orElseThrow(DayNotFoundException::new);
    }

    /**
     * Emits a day-mutation event once the transaction commits ({@link AfterCommit}): an event must
     * not report a change a later rollback erases.
     */
    private void emit(Membership member, String event, UUID itineraryId) {
        AnalyticsEvent built =
                AnalyticsEvent.named(event)
                        .with("itineraryId", itineraryId)
                        .with("travelerId", member.travelerId())
                        .build();
        AfterCommit.run(() -> analytics.emit(built));
    }
}
