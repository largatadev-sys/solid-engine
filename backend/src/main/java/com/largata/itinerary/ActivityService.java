package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Activity child's operations within the Itinerary aggregate (S1.3, ADR-013, ticket 02).
 *
 * <p><strong>Every mutator takes a {@link Membership}</strong>, for {@link DayService}'s reason: an
 * activity cannot be created, edited or deleted by a handler that has not been through the guard, and
 * any member may do it (spec Q8 — members shape the plan; nothing here reads {@code isOwner()}).
 *
 * <p><strong>Two masking checks under the guard's one.</strong> The guard proves the caller may touch
 * the itinerary; this then proves the addressed day belongs to that itinerary, and the addressed
 * activity belongs to that day — each a 404 that reveals nothing (see {@link #requireDay} / {@link
 * #requireActivity}). So a member of trip A addressing an activity of trip B gets the same "not found"
 * as for a nonexistent id.
 *
 * <p><strong>Last-write-wins, whole-entity (2026-07-17 ruling).</strong> {@link #edit} takes the full
 * {@link ActivityFields} and replaces everything; there is no version check, so a later writer wins
 * silently. Attribution ({@code last_edited_by/at}) follows every write, so "who touched it last" is
 * always answerable even though "what the previous value was" is deliberately not kept.
 */
@Service
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);

    /** The most activities a single day may hold — a guard against a runaway client. */
    static final int MAX_ACTIVITIES_PER_DAY = 200;

    private final DayRepository days;
    private final ActivityRepository activities;
    private final EditLeaseService editLease;
    private final Analytics analytics;

    ActivityService(
            DayRepository days,
            ActivityRepository activities,
            EditLeaseService editLease,
            Analytics analytics) {
        this.days = days;
        this.activities = activities;
        this.editLease = editLease;
        this.analytics = analytics;
    }

    /**
     * Creates an activity at the end of a day (S1.3). Any member. 404-masks a day of another plan.
     *
     * <p>The sort order is end-of-day: {@code max + 1}, or 0 for the first activity. Reorder mechanics
     * (drag, cross-day move) are ticket 03; create only ever appends, which keeps this ticket's
     * ordering trivially correct — the list is dense and in insertion order until something reorders it.
     */
    @Transactional
    public ActivityView create(Membership member, UUID dayId, ActivityFields fields) {
        editLease.requireHeldBy(member); // single-writer lock (S1.4, ADR-014) — after the guard
        requireDay(member.itineraryId(), dayId);
        if (activities.countByDayId(dayId) >= MAX_ACTIVITIES_PER_DAY) {
            throw new PlanLimitExceededException("A day holds at most " + MAX_ACTIVITIES_PER_DAY + " activities");
        }
        Integer maxOrder = activities.findMaxSortOrder(dayId);
        int sortOrder = maxOrder == null ? 0 : maxOrder + 1;

        Activity activity =
                activities.save(Activity.create(dayId, sortOrder, fields, member.travelerId(), Instant.now()));
        log.info("Activity created: dayId={} activityId={}", dayId, activity.id());
        emit(member, "activity_created", activity.id());
        return ActivityView.of(activity);
    }

    /**
     * Replaces an activity's content and restamps attribution (S1.3, last-write-wins). Any member.
     * 404-masks an activity of another plan.
     */
    @Transactional
    public ActivityView edit(Membership member, UUID dayId, UUID activityId, ActivityFields fields) {
        editLease.requireHeldBy(member); // single-writer lock (S1.4, ADR-014)
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        activity.edit(fields, member.travelerId(), Instant.now());
        activities.save(activity);
        log.info("Activity edited: dayId={} activityId={} editor={}", dayId, activityId, member.travelerId());
        emit(member, "activity_edited", activityId);
        return ActivityView.of(activity);
    }

    /** Deletes an activity (S1.3). Any member. 404-masks an activity of another plan. */
    @Transactional
    public void delete(Membership member, UUID dayId, UUID activityId) {
        editLease.requireHeldBy(member); // single-writer lock (S1.4, ADR-014)
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        activities.delete(activity);
        log.info("Activity deleted: dayId={} activityId={}", dayId, activityId);
        emit(member, "activity_deleted", activityId);
    }

    /**
     * Reorders a day's activities to a client-given order (S1.3, ticket 03, ADR-013 — manual order is
     * authoritative). Any member.
     *
     * <p><strong>The client sends the complete ordered list of the day's activity ids</strong>, and
     * this rewrites {@code sort_order} to 0,1,2,… to match. A whole-list PUT rather than a per-item
     * move: it is idempotent, it needs no fractional indices, and under last-write-wins two members'
     * reorders resolve to whichever committed last — the same posture as every other write here. Time
     * of day is never consulted; a drag above an earlier-timed activity sticks (spec AC 3).
     *
     * <p>The list must be exactly the day's activities — same set, no missing, no extra, none from
     * another day — else {@code IllegalArgumentException} (→ a 400 the DTO layer surfaces). That check
     * is what stops a stale client (one whose list predates a concurrent add or delete) from silently
     * dropping or duplicating an activity's position.
     */
    @Transactional
    public DayView reorder(Membership member, UUID dayId, List<UUID> orderedActivityIds) {
        editLease.requireHeldBy(member); // single-writer lock (S1.4, ADR-014)
        Day day = requireDay(member.itineraryId(), dayId);
        List<Activity> current = activities.findByDayIdOrderBySortOrderAscIdAsc(dayId);

        Set<UUID> currentIds = current.stream().map(Activity::id).collect(Collectors.toSet());
        Set<UUID> requestedIds = Set.copyOf(orderedActivityIds);
        if (requestedIds.size() != orderedActivityIds.size()) {
            throw new InvalidReorderException("A reorder cannot list the same activity twice");
        }
        if (!currentIds.equals(requestedIds)) {
            // Missing, extra, or foreign ids — a stale or malformed list. Rejecting is what keeps a
            // reorder from silently losing an activity that was added on another device a moment ago.
            // A ValidationException (400), not IllegalArgumentException (500): a stale client is a race,
            // not a bug (see InvalidReorderException).
            throw new InvalidReorderException("A reorder must list exactly the day's activities, once each");
        }

        Map<UUID, Activity> byId = current.stream().collect(Collectors.toMap(Activity::id, a -> a));
        int order = 0;
        List<Activity> reordered = new ArrayList<>(orderedActivityIds.size());
        for (UUID id : orderedActivityIds) {
            Activity activity = byId.get(id);
            activity.reorderTo(order++);
            reordered.add(activities.save(activity));
        }
        log.info("Activities reordered: dayId={} count={}", dayId, orderedActivityIds.size());
        emitForDay(member, "activities_reordered", dayId);
        // Return the reordered day (PUT → 200 + resource, per the API conventions), so the client has
        // the confirmed order without a follow-up read.
        return DayView.of(day, reordered);
    }

    /**
     * Moves an activity to another day, landing it at the target day's end (S1.3, ticket 03). Any
     * member. Separate from {@link #edit} because move is <em>position</em>, edit is <em>content</em>
     * (last-write-wins) — folding one into the other would muddy what "the whole activity changed"
     * means.
     *
     * <p>Both the source day (the {@code dayId} the activity is addressed under) and the target day
     * must belong to the caller's itinerary — two masking checks, so a move cannot smuggle an activity
     * into a plan the caller cannot touch. The activity keeps its content and attribution; only its
     * day and sort position change (the move is not an edit, so it does not restamp {@code
     * last_edited_by} — who wrote the content is still true).
     */
    @Transactional
    public ActivityView move(Membership member, UUID dayId, UUID activityId, UUID targetDayId) {
        editLease.requireHeldBy(member); // single-writer lock (S1.4, ADR-014)
        requireDay(member.itineraryId(), dayId);
        requireDay(member.itineraryId(), targetDayId);
        Activity activity = requireActivity(dayId, activityId);
        if (activities.countByDayId(targetDayId) >= MAX_ACTIVITIES_PER_DAY) {
            throw new PlanLimitExceededException("A day holds at most " + MAX_ACTIVITIES_PER_DAY + " activities");
        }

        Integer maxOrder = activities.findMaxSortOrder(targetDayId);
        int sortOrder = maxOrder == null ? 0 : maxOrder + 1;
        activity.moveToDay(targetDayId, sortOrder);
        activities.save(activity);
        log.info("Activity moved: activityId={} fromDay={} toDay={}", activityId, dayId, targetDayId);
        emit(member, "activity_moved", activityId);
        return ActivityView.of(activity);
    }

    /** The day must belong to the itinerary the guard authorized — else a masking 404. Returns it. */
    private Day requireDay(UUID itineraryId, UUID dayId) {
        return days.findByIdAndItineraryId(dayId, itineraryId).orElseThrow(DayNotFoundException::new);
    }

    /** The activity must belong to the addressed day — else a masking 404. */
    private Activity requireActivity(UUID dayId, UUID activityId) {
        return activities.findByIdAndDayId(activityId, dayId).orElseThrow(ActivityNotFoundException::new);
    }

    /**
     * Emits an activity-mutation event once the transaction commits ({@link AfterCommit}): an event
     * must not report a change a later rollback erases. Ids only, never the activity's text (P3).
     */
    private void emit(Membership member, String event, UUID activityId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("activityId", activityId)
                                        .with("itineraryId", member.itineraryId())
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }

    /**
     * Emits a day-scoped mutation event (the reorder, which is about a day, not one activity) — the
     * id goes under a {@code dayId} key so the event names the entity it actually concerns. Splitting
     * this from {@link #emit} rather than overloading a single {@code id} key keeps every event's
     * attribute honest about what its id is.
     */
    private void emitForDay(Membership member, String event, UUID dayId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("dayId", dayId)
                                        .with("itineraryId", member.itineraryId())
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }
}
