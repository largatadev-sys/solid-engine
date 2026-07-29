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


@Service
public class DayService {

    private static final Logger log = LoggerFactory.getLogger(DayService.class);

    private final DayRepository days;
    private final ActivityRepository activities;
    private final EditLeaseService editLease;
    private final Analytics analytics;

    @PersistenceContext private EntityManager entityManager;

    DayService(
            DayRepository days,
            ActivityRepository activities,
            EditLeaseService editLease,
            Analytics analytics) {
        this.days = days;
        this.activities = activities;
        this.editLease = editLease;
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
        editLease.requireHeldBy(member);
        UUID itineraryId = member.itineraryId();
        long existing = days.countByItineraryId(itineraryId);
        if (existing >= Itinerary.MAX_DAYS) {
            throw new PlanLimitExceededException("An itinerary has at most " + Itinerary.MAX_DAYS + " days");
        }
        int ordinal = (int) existing + 1;
        Day day = days.save(Day.at(itineraryId, ordinal, title, Instant.now()));
        log.info("Day appended: itineraryId={} dayId={} ordinal={}", itineraryId, day.id(), ordinal);
        emit(member, "day_added", itineraryId);
        return DayView.of(day, List.of());
    }


    @Transactional
    public DayView renameDay(Membership member, UUID dayId, String title) {
        editLease.requireHeldBy(member);
        Day day = require(member.itineraryId(), dayId);
        day.rename(title);
        days.save(day);
        log.info("Day renamed: itineraryId={} dayId={}", member.itineraryId(), dayId);
        return DayView.of(day, activities.findByDayIdOrderBySortOrderAscIdAsc(day.id()));
    }


    @Transactional
    public void deleteDay(Membership member, UUID dayId) {
        editLease.requireHeldBy(member);
        UUID itineraryId = member.itineraryId();
        Day day = require(itineraryId, dayId);
        int removedOrdinal = day.ordinal();

        days.delete(day);
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


    private void emit(Membership member, String event, UUID itineraryId) {
        AnalyticsEvent built =
                AnalyticsEvent.named(event)
                        .with("itineraryId", itineraryId)
                        .with("travelerId", member.travelerId())
                        .build();
        AfterCommit.run(() -> analytics.emit(built));
    }
}
