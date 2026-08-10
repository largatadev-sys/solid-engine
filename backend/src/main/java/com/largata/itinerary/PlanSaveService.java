package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.api.SavePlanRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PlanSaveService {

    private static final Logger log = LoggerFactory.getLogger(PlanSaveService.class);

    private final DayRepository days;
    private final ActivityRepository activities;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final PlanVersionService planVersion;
    private final WriteFence fence;
    private final Analytics analytics;
    private final Clock clock;

    @PersistenceContext private EntityManager entityManager;

    PlanSaveService(
            DayRepository days,
            ActivityRepository activities,
            EditLeaseService editLease,
            ActivityHistoryService history,
            PlanVersionService planVersion,
            WriteFence fence,
            Analytics analytics,
            Clock clock) {
        this.days = days;
        this.activities = activities;
        this.editLease = editLease;
        this.history = history;
        this.planVersion = planVersion;
        this.fence = fence;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public long save(Membership member, SavePlanRequest request) {
        fence.requireEditable(member);
        editLease.requireSessionHeldBy(member);

        UUID itineraryId = member.itineraryId();
        long committed = planVersion.currentVersion(itineraryId);
        if (committed != request.basePlanVersion()) {
            throw new StalePlanException(committed);
        }

        List<Day> existingDays = days.findByItineraryIdOrderByOrdinalAsc(itineraryId);
        Map<UUID, Day> daysById =
                existingDays.stream().collect(Collectors.toMap(Day::id, day -> day, (a, b) -> a, LinkedHashMap::new));
        Map<UUID, Activity> activitiesById = new LinkedHashMap<>();
        Map<UUID, UUID> dayOfActivity = new LinkedHashMap<>();
        for (Day day : existingDays) {
            for (Activity activity : activities.findByDayIdOrderBySortOrderAscIdAsc(day.id())) {
                activitiesById.put(activity.id(), activity);
                dayOfActivity.put(activity.id(), day.id());
            }
        }

        requireEveryStagedIdIsOurs(request, daysById, activitiesById);

        List<HistoryEntry> entries = new ArrayList<>();
        Instant at = clock.instant();
        parkExistingOrdinalsOutOfTheWay(existingDays);
        Set<UUID> survivingDays = new LinkedHashSet<>();
        Set<UUID> survivingActivities = new LinkedHashSet<>();

        int ordinal = 0;
        for (SavePlanRequest.StagedDay stagedDay : request.days()) {
            ordinal++;
            Day day = applyDay(itineraryId, stagedDay, ordinal, daysById, entries, at);
            survivingDays.add(day.id());

            int sortOrder = 0;
            List<UUID> orderBefore = orderOf(day.id(), activitiesById, dayOfActivity);
            List<UUID> orderAfter = new ArrayList<>();
            for (SavePlanRequest.StagedActivity stagedActivity : stagedDay.activities()) {
                Activity activity =
                        applyActivity(
                                day.id(), stagedActivity, sortOrder++, activitiesById, dayOfActivity, entries, member, at);
                survivingActivities.add(activity.id());
                orderAfter.add(activity.id());
            }
            if (reordered(orderBefore, orderAfter)) {
                entries.add(new HistoryEntry(HistoryAct.ACTIVITIES_REORDERED, LeaseSubject.day(day.id())));
            }
        }

        deleteAbsent(activitiesById, survivingActivities, entries);
        deleteAbsentDays(daysById, survivingDays, entries);

        entityManager.flush();
        for (HistoryEntry entry : entries) {
            history.record(member, entry.act(), entry.subject());
        }
        long saved = planVersion.bumpTo(itineraryId, committed);

        log.info(
                "Plan saved: itineraryId={} days={} entries={} planVersion={}",
                itineraryId,
                request.days().size(),
                entries.size(),
                saved);
        emit(member, itineraryId, entries.size());
        return saved;
    }


    private void parkExistingOrdinalsOutOfTheWay(List<Day> existingDays) {
        int parked = Itinerary.MAX_DAYS;
        for (Day day : existingDays) {
            day.renumberTo(++parked);
            days.save(day);
        }
        entityManager.flush();
    }


    private Day applyDay(
            UUID itineraryId,
            SavePlanRequest.StagedDay staged,
            int ordinal,
            Map<UUID, Day> daysById,
            List<HistoryEntry> entries,
            Instant at) {
        if (staged.id() == null) {
            Day created = days.save(Day.at(itineraryId, ordinal, staged.title(), at));
            entries.add(new HistoryEntry(HistoryAct.DAY_ADDED, LeaseSubject.day(created.id())));
            return created;
        }
        Day day = daysById.get(staged.id());
        String before = day.title();
        String after = Day.normalizedTitle(staged.title());
        if (!Objects.equals(before, after)) {
            day.rename(staged.title());
            entries.add(new HistoryEntry(HistoryAct.DAY_RENAMED, LeaseSubject.day(day.id())));
        }
        if (day.ordinal() != ordinal) {
            day.renumberTo(ordinal);
        }
        return days.save(day);
    }


    private Activity applyActivity(
            UUID dayId,
            SavePlanRequest.StagedActivity staged,
            int sortOrder,
            Map<UUID, Activity> activitiesById,
            Map<UUID, UUID> dayOfActivity,
            List<HistoryEntry> entries,
            Membership member,
            Instant at) {
        ActivityFields fields = staged.fields().toFields();
        if (staged.id() == null) {
            Activity created = activities.save(Activity.create(dayId, sortOrder, fields, member.travelerId(), at));
            entries.add(new HistoryEntry(HistoryAct.ACTIVITY_ADDED, LeaseSubject.activity(created.id())));
            return created;
        }
        Activity activity = activitiesById.get(staged.id());
        UUID cameFrom = dayOfActivity.get(activity.id());
        if (!dayId.equals(cameFrom)) {
            activity.moveToDay(dayId, sortOrder);
            entries.add(new HistoryEntry(HistoryAct.ACTIVITY_MOVED, LeaseSubject.activity(activity.id())));
        }
        if (!ActivityFields.of(activity).describesSamePlanAs(fields)) {
            activity.edit(fields, member.travelerId(), at);
            entries.add(new HistoryEntry(HistoryAct.ACTIVITY_EDITED, LeaseSubject.activity(activity.id())));
        }
        activity.reorderTo(sortOrder);
        return activities.save(activity);
    }


    private void deleteAbsent(
            Map<UUID, Activity> activitiesById, Set<UUID> surviving, List<HistoryEntry> entries) {
        List<UUID> removed =
                activitiesById.keySet().stream().filter(id -> !surviving.contains(id)).toList();
        for (UUID id : removed) {
            activities.delete(activitiesById.get(id));
            entries.add(new HistoryEntry(HistoryAct.ACTIVITY_DELETED, LeaseSubject.activity(id)));
        }
        if (!removed.isEmpty()) {
            entityManager.flush();
            editLease.releaseSubjects(LeaseSubjectType.ACTIVITY, removed);
        }
    }


    private void deleteAbsentDays(Map<UUID, Day> daysById, Set<UUID> surviving, List<HistoryEntry> entries) {
        List<UUID> removed = daysById.keySet().stream().filter(id -> !surviving.contains(id)).toList();
        for (UUID id : removed) {
            days.delete(daysById.get(id));
            entries.add(new HistoryEntry(HistoryAct.DAY_DELETED, LeaseSubject.day(id)));
        }
        if (!removed.isEmpty()) {
            entityManager.flush();
            editLease.releaseSubjects(LeaseSubjectType.DAY, removed);
        }
    }


    private void requireEveryStagedIdIsOurs(
            SavePlanRequest request, Map<UUID, Day> daysById, Map<UUID, Activity> activitiesById) {
        Set<UUID> seenDays = new LinkedHashSet<>();
        Set<UUID> seenActivities = new LinkedHashSet<>();
        for (SavePlanRequest.StagedDay day : request.days()) {
            if (day.id() != null) {
                if (!daysById.containsKey(day.id()) || !seenDays.add(day.id())) {
                    throw new DayNotFoundException();
                }
            }
            for (SavePlanRequest.StagedActivity activity : day.activities()) {
                if (activity.id() != null
                        && (!activitiesById.containsKey(activity.id()) || !seenActivities.add(activity.id()))) {
                    throw new ActivityNotFoundException();
                }
            }
        }
        if (request.days().size() > Itinerary.MAX_DAYS) {
            throw new PlanLimitExceededException("An itinerary has at most " + Itinerary.MAX_DAYS + " days");
        }
        for (SavePlanRequest.StagedDay day : request.days()) {
            if (day.activities().size() > ActivityService.MAX_ACTIVITIES_PER_DAY) {
                throw new PlanLimitExceededException(
                        "A day holds at most " + ActivityService.MAX_ACTIVITIES_PER_DAY + " activities");
            }
        }
    }


    private List<UUID> orderOf(UUID dayId, Map<UUID, Activity> activitiesById, Map<UUID, UUID> dayOfActivity) {
        return activitiesById.keySet().stream().filter(id -> dayId.equals(dayOfActivity.get(id))).toList();
    }


    private static boolean reordered(List<UUID> before, List<UUID> after) {
        List<UUID> kept = after.stream().filter(before::contains).toList();
        return !kept.equals(before.stream().filter(after::contains).toList());
    }


    private void emit(Membership member, UUID itineraryId, int changes) {
        AnalyticsEvent built =
                AnalyticsEvent.named("plan_saved")
                        .with("itineraryId", itineraryId)
                        .with("travelerId", member.travelerId())
                        .with("changes", changes)
                        .build();
        AfterCommit.run(() -> analytics.emit(built));
    }


    private record HistoryEntry(HistoryAct act, LeaseSubject subject) {}
}
