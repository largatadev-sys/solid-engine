package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
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
    private final ActivityHistoryService history;
    private final WriteFence fence;
    private final Analytics analytics;
    private final PhotoService photos;

    ActivityService(
            DayRepository days,
            ActivityRepository activities,
            EditLeaseService editLease,
            ActivityHistoryService history,
            WriteFence fence,
            Analytics analytics,
            PhotoService photos) {
        this.days = days;
        this.activities = activities;
        this.editLease = editLease;
        this.history = history;
        this.fence = fence;
        this.analytics = analytics;
        this.photos = photos;
    }


    @Transactional
    public ActivityView create(Membership member, UUID dayId, ActivityFields fields) {
        fence.requireEditable(member);
        requireDay(member.itineraryId(), dayId);
        if (activities.countByDayId(dayId) >= MAX_ACTIVITIES_PER_DAY) {
            throw new PlanLimitExceededException("A day holds at most " + MAX_ACTIVITIES_PER_DAY + " activities");
        }
        Integer maxOrder = activities.findMaxSortOrder(dayId);
        int sortOrder = maxOrder == null ? 0 : maxOrder + 1;

        Activity activity =
                activities.save(Activity.create(dayId, sortOrder, fields, member.travelerId(), Instant.now()));
        history.record(member, HistoryAct.ACTIVITY_ADDED, LeaseSubject.activity(activity.id()));
        log.info("Activity created: dayId={} activityId={}", dayId, activity.id());
        emit(member, "activity_created", activity.id());
        return ActivityView.of(activity);
    }


    @Transactional
    public ActivityView edit(Membership member, UUID dayId, UUID activityId, ActivityFields fields) {
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        editLease.requireHeldBy(member, LeaseSubject.activity(activityId));
        activity.edit(fields, member.travelerId(), Instant.now());
        activities.save(activity);
        history.record(member, HistoryAct.ACTIVITY_EDITED, LeaseSubject.activity(activityId));
        log.info("Activity edited: dayId={} activityId={} editor={}", dayId, activityId, member.travelerId());
        emit(member, "activity_edited", activityId);
        return withPhotos(activity);
    }


    @Transactional(readOnly = true)
    public ActivityView view(Membership member, UUID dayId, UUID activityId) {
        requireDay(member.itineraryId(), dayId);
        return withPhotos(requireActivity(dayId, activityId));
    }


    private ActivityView withPhotos(Activity activity) {
        return ActivityView.of(
                activity,
                ActivityPhotoView.allOf(photos.allOf(PhotoSubject.ACTIVITY, activity.id())));
    }


    @Transactional
    public void delete(Membership member, UUID dayId, UUID activityId) {
        requireDay(member.itineraryId(), dayId);
        Activity activity = requireActivity(dayId, activityId);
        editLease.requireHeldBy(member, LeaseSubject.activity(activityId));
        activities.delete(activity);
        editLease.releaseSubjects(LeaseSubjectType.ACTIVITY, List.of(activityId));
        history.record(member, HistoryAct.ACTIVITY_DELETED, LeaseSubject.activity(activityId));
        log.info("Activity deleted: dayId={} activityId={}", dayId, activityId);
        emit(member, "activity_deleted", activityId);
    }


    @Transactional
    public DayView reorder(
            Membership member, UUID dayId, List<UUID> expectedActivityIds, List<UUID> orderedActivityIds) {
        fence.requireEditable(member);
        Day day = requireDay(member.itineraryId(), dayId);
        List<Activity> current = activities.findByDayIdOrderBySortOrderAscIdAsc(dayId);
        List<UUID> currentOrder = current.stream().map(Activity::id).toList();

        if (!currentOrder.equals(expectedActivityIds)) {
            throw new StaleReorderException();
        }

        Set<UUID> requestedIds = Set.copyOf(orderedActivityIds);
        if (requestedIds.size() != orderedActivityIds.size()) {
            throw new InvalidReorderException("A reorder cannot list the same activity twice");
        }
        if (!Set.copyOf(currentOrder).equals(requestedIds)) {
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
        history.record(member, HistoryAct.ACTIVITIES_REORDERED, LeaseSubject.day(dayId));
        log.info("Activities reordered: dayId={} count={}", dayId, orderedActivityIds.size());
        emitForDay(member, "activities_reordered", dayId);
        return DayView.of(day, reordered);
    }


    @Transactional
    public ActivityView move(Membership member, UUID dayId, UUID activityId, UUID targetDayId) {
        requireDay(member.itineraryId(), dayId);
        requireDay(member.itineraryId(), targetDayId);
        Activity activity = requireActivity(dayId, activityId);
        editLease.requireHeldBy(member, LeaseSubject.activity(activityId));
        if (activities.countByDayId(targetDayId) >= MAX_ACTIVITIES_PER_DAY) {
            throw new PlanLimitExceededException("A day holds at most " + MAX_ACTIVITIES_PER_DAY + " activities");
        }

        Integer maxOrder = activities.findMaxSortOrder(targetDayId);
        int sortOrder = maxOrder == null ? 0 : maxOrder + 1;
        activity.moveToDay(targetDayId, sortOrder);
        activities.save(activity);
        history.record(member, HistoryAct.ACTIVITY_MOVED, LeaseSubject.activity(activityId));
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
