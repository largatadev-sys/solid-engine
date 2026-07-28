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
     * @throws com.largata.common.authz.TripArchivedException if the trip is archived (S1.9)
     */
    @Transactional
    public EditLeaseView acquire(Membership member) {
        fence.requireWritable(member); // S1.9 — no lock on a frozen plan; there is nothing to edit
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
     * @throws com.largata.common.authz.TripArchivedException if the trip is archived (S1.9) — the
     *     archive already released every lease, so a renew here can only be a client that has not
     *     noticed yet; telling it the trip is frozen is more useful than telling it the lock is gone
     */
    @Transactional
    public EditLeaseView renew(Membership member) {
        fence.requireWritable(member); // S1.9
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
     * Releases whatever lease a <em>named traveler</em> holds on an itinerary, on the system's behalf
     * rather than the holder's — the hook departure calls when that traveler stops being a member
     * (S1.5, spec §3).
     *
     * <p><strong>Why this exists beside {@link #release}, which looks like it would do.</strong> That
     * one takes the holder's own {@link Membership} — the capability the guard minted for <em>them</em>
     * — because releasing your own lock is a member acting on their own behalf. An owner removing
     * someone else never holds the removed traveler's capability and never can: capabilities are not
     * transferable, which is the property that makes them worth having. So the system-level release
     * takes ids, and its authority comes from the caller having already established, through the guard,
     * that it may end this membership.
     *
     * <p><strong>Not a force-take, and the distinction is load-bearing.</strong> ADR-014 forbids taking
     * a live lease from a member — owner included — because that would let one editor's work be
     * discarded by another mid-edit. This releases the lease of someone who is, as of this same
     * transaction, <em>no longer a member</em>: there is no member left to force anything from. What it
     * actually preserves is a latent invariant — <strong>a lease holder is always a member</strong> —
     * which departure is the first operation in the system able to break. Without it the plan stays
     * locked for up to a full TTL by a person the roster no longer lists, and the modal names them.
     *
     * <p>Deletes a lapsed lease as readily as a live one: an expired row is not a lock (ADR-014), but
     * leaving an ex-member's row behind serves nothing.
     *
     * <p>{@link Propagation#MANDATORY} — this must land in the caller's departure transaction or not at
     * all. A lease freed while the membership delete rolls back would unlock a plan for a member who is
     * still a member; the reverse leaves the ghost lock this method exists to prevent. Same structural
     * argument {@code WorkspaceService.formAround} makes for the same annotation.
     *
     * <p><strong>Do not "de-duplicate" this against {@link #release} — the bodies match, the semantics
     * do not.</strong> That one is {@code @Transactional} (opens its own if none exists), this one is
     * {@code MANDATORY} (refuses to). Having either delegate to the other would also be a
     * <em>self-invocation</em>, which bypasses the Spring proxy entirely and silently drops the
     * propagation setting of the method being called — the S0.2 gotcha. Six lines twice is the cheaper
     * of the two mistakes available here.
     */
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

    /**
     * Releases whoever holds the lease, without naming them (S1.9 archive).
     *
     * <p><strong>Why {@link #releaseHeldBy} could not be reused.</strong> That one filters by holder,
     * and the archiving owner does not know who the holder is — the lease is precisely the thing they
     * cannot see into. Passing "whoever" as a parameter is not expressible; this is the holder-agnostic
     * sibling.
     *
     * <p><strong>Still not a force-take</strong> (ADR-014). That rule governs one member taking the lock
     * from another mid-edit so they can keep editing. Nothing is being taken <em>to edit</em> here: the
     * trip is being frozen, and after this transaction nobody may write the plan at all — including the
     * owner who archived it. What this preserves is the same latent invariant departure protects, one
     * step further: <strong>a lease exists only on a writable trip</strong>, so no code ever reasons
     * about a lock on a frozen plan and no member sees "«someone» is editing" on a trip nobody can edit.
     *
     * <p><strong>Not restored on unarchive</strong> (spec decision 12): a lease is ephemeral concurrency
     * control, not domain state. Whoever wants to edit an unarchived trip acquires a fresh one, which is
     * also the only correct answer after an arbitrary gap — the original holder's edit screen is long
     * gone.
     *
     * <p>{@link Propagation#MANDATORY} and <em>deliberately not delegating</em> to its sibling, for the
     * reason {@code releaseHeldBy} records at length: a delegation here would be a self-invocation,
     * which bypasses the Spring proxy and silently drops the propagation of the method being called
     * (the S0.2 gotcha).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void releaseAnyHold(UUID itineraryId) {
        leases.findByItineraryId(itineraryId)
                .ifPresent(
                        lease -> {
                            leases.delete(lease);
                            log.info("Edit lock released on archive: itineraryId={}", itineraryId);
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
     * <p><strong>S1.9's archive fence runs here too, and this is the one place it is not written at the
     * call site.</strong> Every plan-write method's first line is already this call — that is what makes
     * it the enforcement hook — so checking the fence here covers all nine of them at the seam they are
     * structurally required to pass, rather than in nine copies that a tenth method could forget. It is
     * <em>before</em> the lock check deliberately: on an archived trip nobody holds a lease (archive
     * released it) and nobody may acquire one, so a lock-first order would answer "«nobody» is editing"
     * to a question whose real answer is "this trip is frozen".
     *
     * @throws com.largata.common.authz.TripArchivedException if the trip is archived (S1.9)
     * @throws EditLockedException if this caller does not hold a live lease on the itinerary
     */
    @Transactional
    public void requireHeldBy(Membership member) {
        fence.requireWritable(member); // S1.9 — the archive fence for every plan write, at their seam
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
