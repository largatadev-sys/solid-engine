package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class EditLeaseService {

    private static final Logger log = LoggerFactory.getLogger(EditLeaseService.class);

    private static final String ANONYMOUS_HOLDER = "Another member";

    private final EditLeaseRepository leases;
    private final EditLeaseInserter inserter;
    private final DayRepository days;
    private final ActivityRepository activities;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final WriteFence fence;
    private final TripsTopic trips;
    private final Clock clock;
    private final Duration ttl;

    EditLeaseService(
            EditLeaseRepository leases,
            EditLeaseInserter inserter,
            DayRepository days,
            ActivityRepository activities,
            TravelerService travelers,
            Analytics analytics,
            WriteFence fence,
            TripsTopic trips,
            Clock clock,
            @Value("${largata.edit-lock.ttl:PT3M}") Duration ttl) {
        this.leases = leases;
        this.inserter = inserter;
        this.days = days;
        this.activities = activities;
        this.travelers = travelers;
        this.analytics = analytics;
        this.fence = fence;
        this.trips = trips;
        this.clock = clock;
        this.ttl = ttl;
    }


    @Transactional
    public EditLeaseView acquire(Membership member, LeaseSubject subject) {
        fence.requireEditable(member);
        requireSubjectBelongsTo(member.itineraryId(), subject);
        requireNoCompetingHold(member, subject);
        Instant now = clock.instant();
        Instant expiresAt = now.plus(ttl);
        UUID travelerId = member.travelerId();

        EditLease lease = liveOrStale(subject).orElse(null);
        if (lease == null) {
            EditLeaseView won = insertOrLoseTheRace(member, subject, now, expiresAt);
            if (won != null) {
                return won;
            }
            lease = liveOrStale(subject).orElseThrow(() -> new EditLockedException(ANONYMOUS_HOLDER, subject.type()));
        }

        boolean tookOverExpired = false;
        if (!lease.isLiveAt(now)) {
            tookOverExpired = !lease.isHeldBy(travelerId);
            lease.takeOver(travelerId, now, expiresAt);
        } else if (lease.isHeldBy(travelerId)) {
            lease.takeOver(travelerId, now, expiresAt);
        } else {
            emitNow(member, "edit_lock_denied", subject);
            throw new EditLockedException(labelOf(lease.holderId()), subject.type());
        }
        leases.save(lease);
        logAcquisition(subject, travelerId);
        emit(member, tookOverExpired ? "edit_lock_expired_takeover" : "edit_lock_acquired", subject);
        announceSessionAcquired(member, subject, lease);
        return EditLeaseView.of(lease);
    }


    @Transactional
    public EditLeaseView renew(Membership member, LeaseSubject subject) {
        fence.requireEditable(member);
        Instant now = clock.instant();
        EditLease lease =
                liveOrStale(subject)
                        .filter(l -> l.isLiveAt(now) && l.isHeldBy(member.travelerId()))
                        .orElseThrow(() -> new EditLockedException(currentHolderLabel(subject, now), subject.type()));
        lease.renewUntil(now.plus(ttl));
        leases.save(lease);
        return EditLeaseView.of(lease);
    }


    @Transactional
    public void release(Membership member, LeaseSubject subject) {
        liveOrStale(subject)
                .filter(lease -> lease.isHeldBy(member.travelerId()))
                .ifPresent(
                        lease -> {
                            leases.delete(lease);
                            log.info(
                                    "Edit lease released: subjectType={} subjectId={} holder={}",
                                    subject.type(),
                                    subject.id(),
                                    member.travelerId());
                            announceSessionReleased(member.itineraryId(), subject.type());
                        });
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseHeldBy(UUID itineraryId, UUID travelerId) {
        List<EditLease> held = leases.findByItineraryIdAndHolderId(itineraryId, travelerId);
        if (held.isEmpty()) {
            return;
        }
        leases.deleteAll(held);
        log.info(
                "Edit leases released on departure: itineraryId={} formerHolder={} count={}",
                itineraryId,
                travelerId,
                held.size());
        announceSessionReleasedIfAmong(itineraryId, held);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseAnyHold(UUID itineraryId) {
        List<EditLease> all = leases.findByItineraryId(itineraryId);
        if (all.isEmpty()) {
            return;
        }
        leases.deleteAll(all);
        log.info("Edit leases released on archive: itineraryId={} count={}", itineraryId, all.size());
        announceSessionReleasedIfAmong(itineraryId, all);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseSubjects(LeaseSubjectType type, Collection<UUID> subjectIds) {
        if (subjectIds.isEmpty()) {
            return;
        }
        leases.deleteBySubjectTypeAndSubjectIdIn(type, subjectIds);
    }


    @Transactional
    public void requireHeldBy(Membership member, LeaseSubject subject) {
        fence.requireEditable(member);
        Instant now = clock.instant();
        if (subsumedBySession(member, now)) {
            return;
        }
        boolean held =
                liveOrStale(subject)
                        .filter(l -> l.isLiveAt(now))
                        .map(l -> l.isHeldBy(member.travelerId()))
                        .orElse(false);
        if (!held) {
            emitNow(member, "edit_lock_denied", subject);
            throw new EditLockedException(currentHolderLabel(subject, now), subject.type());
        }
    }


    @Transactional
    public void requireSessionHeldBy(Membership member) {
        fence.requireEditable(member);
        Instant now = clock.instant();
        Optional<EditLease> session = liveSession(member.itineraryId(), now);
        if (session.isPresent() && session.get().isHeldBy(member.travelerId())) {
            return;
        }
        LeaseSubject subject = LeaseSubject.session(member.itineraryId());
        emitNow(member, "edit_lock_denied", subject);
        throw new EditLockedException(
                session.map(held -> labelOf(held.holderId())).orElse(ANONYMOUS_HOLDER), LeaseSubjectType.SESSION);
    }


    @Transactional
    public void requireNoForeignSession(Membership member) {
        fence.requireEditable(member);
        subsumedBySession(member, clock.instant());
    }


    @Transactional
    public void requireSessionFreeForLifecycle(Membership member) {
        subsumedBySession(member, clock.instant());
    }


    private boolean subsumedBySession(Membership member, Instant now) {
        Optional<EditLease> session = liveSession(member.itineraryId(), now);
        if (session.isEmpty()) {
            return false;
        }
        EditLease held = session.get();
        if (held.isHeldBy(member.travelerId())) {
            return true;
        }
        emitNow(member, "edit_lock_denied", LeaseSubject.session(member.itineraryId()));
        throw new EditLockedException(labelOf(held.holderId()), LeaseSubjectType.SESSION);
    }


    private Optional<EditLease> liveSession(UUID itineraryId, Instant now) {
        return leases
                .findBySubjectTypeAndSubjectId(LeaseSubjectType.SESSION, itineraryId)
                .filter(lease -> lease.isLiveAt(now));
    }


    @Transactional(readOnly = true)
    public Optional<LeaseHolder> sessionHolderOf(UUID itineraryId) {
        return liveSession(itineraryId, clock.instant())
                .map(lease -> holderOf(lease, summariesOf(List.of(lease.holderId())).get(lease.holderId())));
    }


    @Transactional(readOnly = true)
    public Map<LeaseSubject, LeaseHolder> liveHoldersFor(UUID itineraryId) {
        Instant now = clock.instant();
        List<EditLease> live = leases.findByItineraryId(itineraryId).stream().filter(l -> l.isLiveAt(now)).toList();
        if (live.isEmpty()) {
            return Map.of();
        }
        Map<UUID, TravelerSummary> holders = summariesOf(live.stream().map(EditLease::holderId).toList());
        Map<LeaseSubject, LeaseHolder> bySubject = new LinkedHashMap<>();
        for (EditLease lease : live) {
            bySubject.put(lease.subject(), holderOf(lease, holders.get(lease.holderId())));
        }
        return bySubject;
    }


    @Transactional(readOnly = true)
    public Set<UUID> itinerariesBeingEdited(Collection<UUID> itineraryIds) {
        if (itineraryIds.isEmpty()) {
            return Set.of();
        }
        Instant now = clock.instant();
        return leases.findByItineraryIdIn(itineraryIds).stream()
                .filter(lease -> lease.isLiveAt(now))
                .map(EditLease::itineraryId)
                .collect(Collectors.toSet());
    }


    @Transactional(readOnly = true)
    public Optional<LeaseHolder> activityLeaseHeldByAnother(Collection<UUID> activityIds, UUID travelerId) {
        if (activityIds.isEmpty()) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        return leases
                .findBySubjectTypeAndSubjectIdIn(LeaseSubjectType.ACTIVITY, activityIds)
                .stream()
                .filter(lease -> lease.isLiveAt(now) && !lease.isHeldBy(travelerId))
                .findFirst()
                .map(lease -> holderOf(lease, summariesOf(List.of(lease.holderId())).get(lease.holderId())));
    }


    private EditLeaseView insertOrLoseTheRace(
            Membership member, LeaseSubject subject, Instant now, Instant expiresAt) {
        try {
            EditLease fresh =
                    inserter.insert(member.itineraryId(), subject, member.travelerId(), now, expiresAt);
            logAcquisition(subject, member.travelerId());
            emit(member, "edit_lock_acquired", subject);
            announceSessionAcquired(member, subject, fresh);
            return EditLeaseView.of(fresh);
        } catch (DataIntegrityViolationException somebodyElseGotThereFirst) {
            return null;
        }
    }


    private void announceSessionAcquired(Membership member, LeaseSubject subject, EditLease lease) {
        if (subject.type() != LeaseSubjectType.SESSION) {
            return;
        }
        TravelerSummary summary = summariesOf(List.of(lease.holderId())).get(lease.holderId());
        trips.broadcastEditingSessionAcquired(member.itineraryId(), holderOf(lease, summary));
    }


    private void announceSessionReleased(UUID itineraryId, LeaseSubjectType type) {
        if (type == LeaseSubjectType.SESSION) {
            trips.broadcastEditingSessionReleased(itineraryId);
        }
    }


    private void announceSessionReleasedIfAmong(UUID itineraryId, Collection<EditLease> released) {
        if (released.stream().anyMatch(lease -> lease.subject().type() == LeaseSubjectType.SESSION)) {
            trips.broadcastEditingSessionReleased(itineraryId);
        }
    }


    private Optional<EditLease> liveOrStale(LeaseSubject subject) {
        return leases.findBySubjectTypeAndSubjectId(subject.type(), subject.id());
    }


    private void requireNoCompetingHold(Membership member, LeaseSubject wanted) {
        Instant now = clock.instant();
        Optional<EditLease> competing =
                leases.findByItineraryId(member.itineraryId()).stream()
                        .filter(lease -> lease.isLiveAt(now))
                        .filter(lease -> !lease.isHeldBy(member.travelerId()))
                        .filter(lease -> !lease.subject().equals(wanted))
                        .filter(lease -> excludes(wanted.type(), lease.subject().type()))
                        .findFirst();
        if (competing.isPresent()) {
            EditLease held = competing.get();
            emitNow(member, "edit_lock_denied", wanted);
            throw new EditLockedException(labelOf(held.holderId()), wanted.type());
        }
    }


    private static boolean excludes(LeaseSubjectType wanted, LeaseSubjectType held) {
        return wanted == LeaseSubjectType.SESSION || held == LeaseSubjectType.SESSION;
    }


    private void requireSubjectBelongsTo(UUID itineraryId, LeaseSubject subject) {
        switch (subject.type()) {
            case HEADER, SESSION -> {
                if (!subject.id().equals(itineraryId)) {
                    throw new UnknownLeaseSubjectException(subject.id().toString());
                }
            }
            case DAY -> requireDayOf(itineraryId, subject.id());
            case ACTIVITY -> {
                Activity activity =
                        activities.findById(subject.id()).orElseThrow(ActivityNotFoundException::new);
                requireDayOf(itineraryId, activity.dayId());
            }
        }
    }


    private void requireDayOf(UUID itineraryId, UUID dayId) {
        days.findByIdAndItineraryId(dayId, itineraryId).orElseThrow(DayNotFoundException::new);
    }


    private String currentHolderLabel(LeaseSubject subject, Instant now) {
        return liveOrStale(subject)
                .filter(l -> l.isLiveAt(now))
                .map(l -> labelOf(l.holderId()))
                .orElse(ANONYMOUS_HOLDER);
    }


    private String labelOf(UUID holderId) {
        return summariesOf(List.of(holderId)).values().stream()
                .findFirst()
                .map(EditLeaseService::label)
                .orElse(ANONYMOUS_HOLDER);
    }


    private static String label(TravelerSummary summary) {
        if (summary.handle() != null && !summary.handle().isBlank()) {
            return "@" + summary.handle();
        }
        if (summary.displayName() != null && !summary.displayName().isBlank()) {
            return summary.displayName();
        }
        return ANONYMOUS_HOLDER;
    }


    private Map<UUID, TravelerSummary> summariesOf(Collection<UUID> travelerIds) {
        return travelers.summariesByIds(travelerIds).stream()
                .collect(Collectors.toMap(TravelerSummary::id, Function.identity()));
    }


    private static LeaseHolder holderOf(EditLease lease, TravelerSummary summary) {
        return new LeaseHolder(
                lease.holderId(),
                summary == null ? null : summary.handle(),
                summary == null ? null : summary.displayName(),
                summary == null ? null : summary.avatarUrl(),
                lease.expiresAt());
    }


    private static void logAcquisition(LeaseSubject subject, UUID holderId) {
        log.info(
                "Edit lease acquired: subjectType={} subjectId={} holder={}",
                subject.type(),
                subject.id(),
                holderId);
    }


    private void emit(Membership member, String event, LeaseSubject subject) {
        AfterCommit.run(() -> analytics.emit(build(member, event, subject)));
    }


    private void emitNow(Membership member, String event, LeaseSubject subject) {
        analytics.emit(build(member, event, subject));
    }

    private static AnalyticsEvent build(Membership member, String event, LeaseSubject subject) {
        return AnalyticsEvent.named(event)
                .with("itineraryId", member.itineraryId())
                .with("travelerId", member.travelerId())
                .with("subjectType", subject.type().wireName())
                .with("subjectId", subject.id())
                .build();
    }
}
