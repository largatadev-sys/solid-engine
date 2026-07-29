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


@Service
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);


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


    @Transactional
    public ActivityView create(Membership member, UUID dayId, ActivityFields fields) {
        editLease.requireHeldBy(member);
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


    @Transactional
    public ActivityView edit(Membership member, UUID dayId, UUID activityId, ActivityFields fields) {
        editLease.requireHeldBy(member);
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        activity.edit(fields, member.travelerId(), Instant.now());
        activities.save(activity);
        log.info("Activity edited: dayId={} activityId={} editor={}", dayId, activityId, member.travelerId());
        emit(member, "activity_edited", activityId);
        return ActivityView.of(activity);
    }


    @Transactional
    public void delete(Membership member, UUID dayId, UUID activityId) {
        editLease.requireHeldBy(member);
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        activities.delete(activity);
        log.info("Activity deleted: dayId={} activityId={}", dayId, activityId);
        emit(member, "activity_deleted", activityId);
    }


    @Transactional
    public DayView reorder(Membership member, UUID dayId, List<UUID> orderedActivityIds) {
        editLease.requireHeldBy(member);
        Day day = requireDay(member.itineraryId(), dayId);
        List<Activity> current = activities.findByDayIdOrderBySortOrderAscIdAsc(dayId);

        Set<UUID> currentIds = current.stream().map(Activity::id).collect(Collectors.toSet());
        Set<UUID> requestedIds = Set.copyOf(orderedActivityIds);
        if (requestedIds.size() != orderedActivityIds.size()) {
            throw new InvalidReorderException("A reorder cannot list the same activity twice");
        }
        if (!currentIds.equals(requestedIds)) {
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
        return DayView.of(day, reordered);
    }


    @Transactional
    public ActivityView move(Membership member, UUID dayId, UUID activityId, UUID targetDayId) {
        editLease.requireHeldBy(member);
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


    private Day requireDay(UUID itineraryId, UUID dayId) {
        return days.findByIdAndItineraryId(dayId, itineraryId).orElseThrow(DayNotFoundException::new);
    }


    private Activity requireActivity(UUID dayId, UUID activityId) {
        return activities.findByIdAndDayId(activityId, dayId).orElseThrow(ActivityNotFoundException::new);
    }


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
