package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
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
import org.springframework.transaction.annotation.Transactional;

/**
 * The single-writer edit lock (S1.4, ADR-014): who, if anyone, is editing an itinerary's plan right
 * now, and the acquire / renew / release / enforce operations over it.
 *
 * <p><strong>Every mutator takes a {@link Membership}</strong> — the same structural guarantee the
 * rest of this module turns on: a lease cannot be acquired, renewed or released by a handler that has
 * not been through the guard, so a non-member can never become a holder or learn a lock's state
 * (they are 404-masked before reaching here). Any role may hold the lock — the lock does not care
 * about ownership; even the owner is locked out while a member holds it (ADR-014, no force-take).
 *
 * <p><strong>Expiry is the real guarantee, not release</strong> (ADR-014). A row whose {@code
 * expiresAt} has passed is treated as no lock: {@link #acquire} overwrites it, {@link #requireHeldBy}
 * ignores it. This is what lets a client that dies mid-edit — never sending a release — free its
 * lease anyway. Time is read from an injected {@link Clock} so the expiry and renewal ITs advance a
 * controlled clock rather than sleeping past a real TTL.
 *
 * <p>The lock guards <em>plan</em> editing and lives in the itinerary module because that is the
 * aggregate it protects (ADR-002); {@link #requireHeldBy} is the enforcement hook every plan-write
 * service method calls after the guard resolves membership.
 */
@Service
public class EditLeaseService {

    private static final Logger log = LoggerFactory.getLogger(EditLeaseService.class);

    private final EditLeaseRepository leases;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final Clock clock;
    private final Duration ttl;

    EditLeaseService(
            EditLeaseRepository leases,
            TravelerService travelers,
            Analytics analytics,
            Clock clock,
            @Value("${largata.edit-lock.ttl:PT3M}") Duration ttl) {
        this.leases = leases;
        this.travelers = travelers;
        this.analytics = analytics;
        this.clock = clock;
        this.ttl = ttl;
    }

    /**
     * Acquires (or re-acquires) the edit lock on this member's itinerary, extending it a fresh TTL.
     *
     * <p>Granted when the lock is free, expired, or already this caller's — in all three the caller
     * ends up holding a lease live for another TTL. Refused, with {@link EditLockedException} naming
     * the holder, only when a <em>different</em> member holds a <em>live</em> lease. Re-acquiring your
     * own lease is idempotent-ish: it simply renews, so re-entering an edit surface you already hold
     * never fails.
     *
     * @return the granted lease (holder + fresh expiry)
     * @throws EditLockedException if another member holds a live lease
     */
    @Transactional
    public EditLeaseView acquire(Membership member) {
        Instant now = clock.instant();
        UUID itineraryId = member.itineraryId();
        UUID travelerId = member.travelerId();
        Instant expiresAt = now.plus(ttl);

        EditLease lease = leases.findByItineraryId(itineraryId).orElse(null);
        boolean tookOverExpired = false;
        if (lease == null) {
            lease = EditLease.heldBy(itineraryId, travelerId, now, expiresAt);
        } else if (!lease.isLiveAt(now)) {
            // Free-by-expiry (possibly someone else's abandoned lease) → take it over in place. One
            // row per itinerary always (V8), so this overwrites rather than inserting a second.
            tookOverExpired = !lease.isHeldBy(travelerId);
            lease.takeOver(travelerId, now, expiresAt);
        } else if (lease.isHeldBy(travelerId)) {
            // Already ours and live → renew in place (re-entering an edit surface never fails).
            lease.takeOver(travelerId, now, expiresAt);
        } else {
            // A different member holds a live lease. Refuse, naming them for the client's modal.
            emitNow(member, "edit_lock_denied");
            throw new EditLockedException(holderName(lease.holderId()));
        }
        leases.save(lease);
        log.info("Edit lock acquired: itineraryId={} holder={}", itineraryId, travelerId);
        // A take-over of another member's *expired* lease is worth its own event: it means someone
        // abandoned an edit (client died / backgrounded) and a second member reclaimed the plan.
        emit(member, tookOverExpired ? "edit_lock_expired_takeover" : "edit_lock_acquired");
        return EditLeaseView.of(lease);
    }

    /**
     * Renews the caller's own live lease, pushing expiry out another TTL — the 60s heartbeat while an
     * edit screen stays open. Renewing a lease you do not hold (someone took over after your client
     * lost the network, say) is a lock conflict, named the same way as a denied acquire.
     *
     * @throws EditLockedException if the lease is not (or no longer) held by this caller
     */
    @Transactional
    public EditLeaseView renew(Membership member) {
        Instant now = clock.instant();
        EditLease lease =
                leases.findByItineraryId(member.itineraryId())
                        .filter(l -> l.isLiveAt(now) && l.isHeldBy(member.travelerId()))
                        .orElseThrow(() -> new EditLockedException(currentHolderName(member.itineraryId(), now)));
        lease.renewUntil(now.plus(ttl));
        leases.save(lease);
        return EditLeaseView.of(lease);
    }

    /**
     * Releases the caller's own lease immediately — the courtesy path when they save, cancel or leave
     * the edit surface (expiry is the guarantee, this is the fast free). Idempotent: releasing when
     * you hold nothing (already expired, already taken over) is a no-op, never an error — a client
     * firing a best-effort release on navigate-away must not see a failure.
     */
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

    /**
     * Enforcement hook (S1.4, ticket 02): the caller must hold the live lease, or the write is
     * refused. Every plan-write service method calls this <em>after</em> the guard has resolved
     * membership — so a non-member is already 404-masked, and this only ever answers the
     * member-vs-member "who is editing" question.
     *
     * <p>An acquire-over-expired here (someone whose lease lapsed, then wrote) is a lock conflict, not
     * a silent grant: writing requires <em>holding</em> the lease, and a lapsed one is not held. The
     * client's contract is acquire-then-write; a write without a live hold is the race where the lease
     * expired mid-edit and someone else took over, which is exactly the modal's situation.
     *
     * @throws EditLockedException if this caller does not hold a live lease on the itinerary
     */
    @Transactional
    public void requireHeldBy(Membership member) {
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

    /**
     * The name to show when a write or renew is refused: the live holder's, or a neutral fallback if
     * the lease lapsed in the instant between the caller's failed check and this lookup (a race in
     * which "someone" is the honest answer — there is no live holder to name).
     */
    private String currentHolderName(UUID itineraryId, Instant now) {
        return leases.findByItineraryId(itineraryId)
                .filter(l -> l.isLiveAt(now))
                .map(l -> holderName(l.holderId()))
                .orElse("Another member");
    }

    /**
     * The holder's display name via the identity module (the S1.2 cross-module name lookup, ADR-002).
     * Falls back to a neutral label if the name is absent — S1.2 guarantees a display name at join and
     * the holder is always a member, so this is belt-and-braces, not an expected path.
     */
    private String holderName(UUID holderId) {
        return travelers.summariesByIds(List.of(holderId)).stream()
                .findFirst()
                .map(TravelerSummary::displayName)
                .filter(name -> name != null && !name.isBlank())
                .orElse("Another member");
    }

    /** A lock event that only makes sense if the transaction commits (a successful acquire/take-over). */
    private void emit(Membership member, String event) {
        AfterCommit.run(() -> analytics.emit(build(member, event)));
    }

    /**
     * A lock <em>rejection</em> event, emitted immediately rather than after commit. A denied acquire
     * or write throws, which rolls the transaction back — so an after-commit emit would be discarded,
     * and the very events a lock-contention funnel most wants to count ("how often do members collide")
     * would never fire. The emit is a log line, not a DB write, so firing it inside a
     * to-be-rolled-back transaction is correct: nothing to undo.
     */
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
