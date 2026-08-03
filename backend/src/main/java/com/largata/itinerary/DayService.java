package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
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


@Service
public class DayService {

    private static final Logger log = LoggerFactory.getLogger(DayService.class);

    private final DayRepository days;
    private final ActivityRepository activities;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final WriteFence fence;
    private final Analytics analytics;

    @PersistenceContext private EntityManager entityManager;

    DayService(
            DayRepository days,
            ActivityRepository activities,
            EditLeaseService editLease,
            ActivityHistoryService history,
            WriteFence fence,
            Analytics analytics) {
        this.days = days;
        this.activities = activities;
        this.editLease = editLease;
        this.history = history;
        this.fence = fence;
        this.analytics = analytics;
    }


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


    @Transactional(readOnly = true)
    public List<DayView> plan(UUID itineraryId) {
        return days.findByItineraryIdOrderByOrdinalAsc(itineraryId).stream()
                .map(day -> DayView.of(day, activities.findByDayIdOrderBySortOrderAscIdAsc(day.id())))
                .toList();
    }


    @Transactional
    public DayView appendDay(Membership member, String title) {
        requireOwnerOfWritableTrip(member);
        UUID itineraryId = member.itineraryId();
        long existing = days.countByItineraryId(itineraryId);
        if (existing >= Itinerary.MAX_DAYS) {
            throw new PlanLimitExceededException("An itinerary has at most " + Itinerary.MAX_DAYS + " days");
        }
        int ordinal = (int) existing + 1;
        Day day = days.save(Day.at(itineraryId, ordinal, title, Instant.now()));
        history.record(member, HistoryAct.DAY_ADDED, LeaseSubject.day(day.id()));
        log.info("Day appended: itineraryId={} dayId={} ordinal={}", itineraryId, day.id(), ordinal);
        emit(member, "day_added", itineraryId);
        return DayView.of(day, List.of());
    }


    @Transactional
    public DayView renameDay(Membership member, UUID dayId, String title) {
        Day day = require(member.itineraryId(), dayId);
        editLease.requireHeldBy(member, LeaseSubject.day(dayId));
        day.rename(title);
        days.save(day);
        history.record(member, HistoryAct.DAY_RENAMED, LeaseSubject.day(dayId));
        log.info("Day renamed: itineraryId={} dayId={}", member.itineraryId(), dayId);
        return DayView.of(day, activities.findByDayIdOrderBySortOrderAscIdAsc(day.id()));
    }


    @Transactional
    public void deleteDay(Membership member, UUID dayId) {
        requireOwnerOfWritableTrip(member);
        UUID itineraryId = member.itineraryId();
        Day day = require(itineraryId, dayId);
        editLease.requireHeldBy(member, LeaseSubject.day(dayId));

        List<UUID> containedIds =
                activities.findByDayIdOrderBySortOrderAscIdAsc(dayId).stream().map(Activity::id).toList();
        editLease
                .activityLeaseHeldByAnother(containedIds, member.travelerId())
                .ifPresent(holder -> {
                    throw new DayHasLeasedActivityException(holder);
                });

        int removedOrdinal = day.ordinal();
        days.delete(day);
        entityManager.flush();
        editLease.releaseSubjects(LeaseSubjectType.ACTIVITY, containedIds);
        editLease.releaseSubjects(LeaseSubjectType.DAY, List.of(dayId));

        List<Day> toRenumber =
                days.findByItineraryIdOrderByOrdinalAsc(itineraryId).stream()
                        .filter(d -> d.ordinal() > removedOrdinal)
                        .toList();
        for (Day above : toRenumber) {
            above.renumberTo(above.ordinal() - 1);
            days.save(above);
        }
        history.record(member, HistoryAct.DAY_DELETED, LeaseSubject.day(dayId));
        log.info("Day deleted: itineraryId={} dayId={} renumbered={}", itineraryId, dayId, toRenumber.size());
        emit(member, "day_removed", itineraryId);
    }

    private Day require(UUID itineraryId, UUID dayId) {
        return days.findByIdAndItineraryId(dayId, itineraryId).orElseThrow(DayNotFoundException::new);
    }


    private void requireOwnerOfWritableTrip(Membership member) {
        fence.requireEditable(member);
        if (!member.isOwner()) {
            throw new NotTripOwnerException("Only the trip owner can add or remove days.");
        }
    }


    private void emit(Membership member, String event, UUID itineraryId) {
        AnalyticsEvent built =
                AnalyticsEvent.named(event)
                        .with("itineraryId", itineraryId)
                        .with("travelerId", member.travelerId())
                        .build();
        AfterCommit.run(() -> analytics.emit(built));
    }
}
