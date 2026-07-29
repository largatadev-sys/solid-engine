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
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class EditLeaseService {

    private static final Logger log = LoggerFactory.getLogger(EditLeaseService.class);

    private final EditLeaseRepository leases;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final WriteFence fence;
    private final Clock clock;
    private final Duration ttl;

    EditLeaseService(
            EditLeaseRepository leases,
            TravelerService travelers,
            Analytics analytics,
            WriteFence fence,
            Clock clock,
            @Value("${largata.edit-lock.ttl:PT3M}") Duration ttl) {
        this.leases = leases;
        this.travelers = travelers;
        this.analytics = analytics;
        this.fence = fence;
        this.clock = clock;
        this.ttl = ttl;
    }


    @Transactional
    public EditLeaseView acquire(Membership member) {
        fence.requireWritable(member);
        Instant now = clock.instant();
        UUID itineraryId = member.itineraryId();
        UUID travelerId = member.travelerId();
        Instant expiresAt = now.plus(ttl);

        EditLease lease = leases.findByItineraryId(itineraryId).orElse(null);
        boolean tookOverExpired = false;
        if (lease == null) {
            lease = EditLease.heldBy(itineraryId, travelerId, now, expiresAt);
        } else if (!lease.isLiveAt(now)) {
            tookOverExpired = !lease.isHeldBy(travelerId);
            lease.takeOver(travelerId, now, expiresAt);
        } else if (lease.isHeldBy(travelerId)) {
            lease.takeOver(travelerId, now, expiresAt);
        } else {
            emitNow(member, "edit_lock_denied");
            throw new EditLockedException(holderName(lease.holderId()));
        }
        leases.save(lease);
        log.info("Edit lock acquired: itineraryId={} holder={}", itineraryId, travelerId);
        emit(member, tookOverExpired ? "edit_lock_expired_takeover" : "edit_lock_acquired");
        return EditLeaseView.of(lease);
    }


    @Transactional
    public EditLeaseView renew(Membership member) {
        fence.requireWritable(member);
        Instant now = clock.instant();
        EditLease lease =
                leases.findByItineraryId(member.itineraryId())
                        .filter(l -> l.isLiveAt(now) && l.isHeldBy(member.travelerId()))
                        .orElseThrow(() -> new EditLockedException(currentHolderName(member.itineraryId(), now)));
        lease.renewUntil(now.plus(ttl));
        leases.save(lease);
        return EditLeaseView.of(lease);
    }


    @Transactional
    public void release(Membership member) {
        leases.findByItineraryId(member.itineraryId())
                .filter(l -> l.isHeldBy(member.travelerId()))
                .ifPresent(
                        lease -> {
                            leases.delete(lease);
                            log.info(
                                    "Edit lock released: itineraryId={} holder={}",
                                    member.itineraryId(),
                                    member.travelerId());
                        });
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseHeldBy(UUID itineraryId, UUID travelerId) {
        leases.findByItineraryId(itineraryId)
                .filter(lease -> lease.isHeldBy(travelerId))
                .ifPresent(
                        lease -> {
                            leases.delete(lease);
                            log.info(
                                    "Edit lock released on departure: itineraryId={} formerHolder={}",
                                    itineraryId,
                                    travelerId);
                        });
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseAnyHold(UUID itineraryId) {
        leases.findByItineraryId(itineraryId)
                .ifPresent(
                        lease -> {
                            leases.delete(lease);
                            log.info("Edit lock released on archive: itineraryId={}", itineraryId);
                        });
    }


    @Transactional
    public void requireHeldBy(Membership member) {
        fence.requireWritable(member);
        Instant now = clock.instant();
        boolean held =
                leases.findByItineraryId(member.itineraryId())
                        .filter(l -> l.isLiveAt(now))
                        .map(l -> l.isHeldBy(member.travelerId()))
                        .orElse(false);
        if (!held) {
            emitNow(member, "edit_lock_denied");
            throw new EditLockedException(currentHolderName(member.itineraryId(), now));
        }
    }


    private String currentHolderName(UUID itineraryId, Instant now) {
        return leases.findByItineraryId(itineraryId)
                .filter(l -> l.isLiveAt(now))
                .map(l -> holderName(l.holderId()))
                .orElse("Another member");
    }


    private String holderName(UUID holderId) {
        return travelers.summariesByIds(List.of(holderId)).stream()
                .findFirst()
                .map(TravelerSummary::displayName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("Another member");
    }


    private void emit(Membership member, String event) {
        AfterCommit.run(() -> analytics.emit(build(member, event)));
    }


    private void emitNow(Membership member, String event) {
        analytics.emit(build(member, event));
    }

    private static AnalyticsEvent build(Membership member, String event) {
        return AnalyticsEvent.named(event)
                .with("itineraryId", member.itineraryId())
                .with("travelerId", member.travelerId())
                .build();
    }
}
