package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The itinerary module's one entry point (ADR-002: modules are reached by service interface, never
 * by another module's tables).
 *
 * <p><strong>Read {@link #view} 's signature first — it is the story's point.</strong> It takes a
 * {@link Membership}, not a traveler id, so it cannot be called by a handler that has not been
 * through {@link com.largata.common.authz.AuthorizationGuard}. That is Artifact 03's structural
 * guarantee in one parameter: a forgotten authorization check does not compile. Every workspace-
 * scoped method this codebase ever grows follows this shape.
 */
@Service
public class ItineraryService {

    private static final Logger log = LoggerFactory.getLogger(ItineraryService.class);

    /** Artifact 05's list defaults — see {@link #listMine}. */
    private static final int DEFAULT_PAGE_SIZE = 20;

    private static final int MAX_PAGE_SIZE = 100;

    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;
    private final DayService days;
    private final EditLeaseService editLease;
    private final WriteFence fence;
    private final Analytics analytics;

    ItineraryService(
            ItineraryRepository itineraries,
            WorkspaceService workspaces,
            DayService days,
            EditLeaseService editLease,
            WriteFence fence,
            Analytics analytics) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
        this.days = days;
        this.editLease = editLease;
        this.fence = fence;
        this.analytics = analytics;
    }

    /**
     * Creates a draft itinerary owned by its creator, and opens its Workspace in the same breath.
     *
     * <p>No {@link Membership} parameter, and that is not an oversight: there is nothing yet to be a
     * member of. Creation is the act that <em>establishes</em> ownership — the guard has nothing to
     * resolve until the row exists.
     *
     * <p><strong>The workspace forms inside this transaction (S1.1), and that is the invariant, not
     * a detail.</strong> Artifact 03: no ownerless window ever exists. From S1.1 the guard reads
     * standing from membership rows, so an itinerary that committed without its workspace would be
     * invisible to its own creator — permanently, and with no error naming why. Atomicity is what
     * makes that state unreachable. The rollback direction is the half worth testing, and {@code
     * ItineraryFormationIT} tests it.
     *
     * <p>The call goes itinerary → workspace and never back: the workspace module answers the
     * guard's question from its own tables, so the two modules do not form the cycle ADR-011 exists
     * to prevent.
     */
    /**
     * The S0.3 create shape — no description, no day skeleton — kept as a delegating overload so the
     * many callers that predate S1.3 (workspace and invitation tests, which create trips only to have
     * a workspace to act on) do not churn. Additive by construction: it is the new create with {@code
     * description = null} and {@code durationDays = 0}, which is exactly what "an S0.3 itinerary" means.
     */
    @Transactional
    public Itinerary create(
            UUID ownerId, String title, List<String> destinations, LocalDate startDate, LocalDate endDate) {
        return create(ownerId, title, destinations, null, startDate, endDate, 0);
    }

    @Transactional
    public Itinerary create(
            UUID ownerId,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            int durationDays) {
        Itinerary itinerary =
                itineraries.save(
                        Itinerary.draft(ownerId, title, destinations, description, startDate, endDate, Instant.now()));
        // The itinerary's own instant, not now(): the workspace exists from the trip's first moment.
        workspaces.formAround(itinerary.id(), itinerary.ownerId(), itinerary.createdAt());
        // ...and its day skeleton, in the same transaction: durationDays mints that many contiguous
        // empty days (0 for an undated plan). Same instant, so the days are as old as the trip.
        days.seedDays(itinerary.id(), durationDays, itinerary.createdAt());
        // Note for the caller: the days now exist, and `createWithPlan` is what hands them back. A
        // caller using this method alone gets the root only — see that method's javadoc for why the
        // create *response* must carry the plan.
        // The operational line (06b §4: one info line on success, entity id + operation). Distinct
        // from the analytics event below and not a substitute for it: this one answers "what did the
        // system do at 14:02" for an operator reading the app's own log; that one feeds a funnel and
        // rides a separate, separately-routable logger. Ids only, never the title (P3).
        log.info("Itinerary created: id={} ownerId={}", itinerary.id(), itinerary.ownerId());
        emitAfterCommit(itinerary);
        return itinerary;
    }

    /**
     * Creates an itinerary and returns it <strong>with the day skeleton it just seeded</strong>
     * (S1.3, ticket 01 — corrected at the device smoke test).
     *
     * <p><strong>Why the create response must carry the plan.</strong> The mobile client seeds its
     * single-itinerary cache from the create response (the S0.3 `onItineraryCreated` pattern, so
     * opening the new trip needs no round trip). When this response omitted the days — as it did
     * originally, on the reasoning that create "returns before any day is meaningfully populated" —
     * the client cached <em>"this trip has no days"</em> for a trip that had just been given three,
     * and the Daily Schedules screen showed an empty plan until something forced a refetch.
     *
     * <p>Two individually-defensible decisions in different layers, colliding: the omission was
     * invisible to the backend ITs (which assert {@code GET} embeds days — true) and to the mobile
     * tests (which assert the seeding happens — also true). Only running the app found it. The fix is
     * here rather than in the client because the honest answer to "what did you just create" includes
     * the days it minted.
     */
    @Transactional
    public ItineraryPlan createWithPlan(
            UUID ownerId,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            int durationDays) {
        Itinerary itinerary =
                create(ownerId, title, destinations, description, startDate, endDate, durationDays);
        // Never archived: this trip was created moments ago, and archive is an act on an existing one.
        // Stated as a literal rather than read back, so create pays for no extra query to learn a fact
        // it already knows.
        return new ItineraryPlan(itinerary, days.plan(itinerary.id()), false);
    }

    /**
     * The itinerary the guard has already authorized this caller for.
     *
     * <p><strong>By id, because the membership is the authority</strong> (S1.2). Until members
     * existed (S0.3), this re-read by {@code (id, ownerId)} as belt-and-braces — harmless when every
     * authorized caller was the owner. S1.2 makes that wrong: an accepted member passes the guard but
     * is not the owner, so an owner-scoped re-read would 404 the very traveler the guard just admitted
     * (it surfaced as a 500 on a member viewing a joined trip). The guard's {@link Membership} is the
     * check; this fetches what it authorized, and the row must exist — a missing one means the guard
     * resolved standing for an itinerary that does not exist, an invariant breach, not a user error.
     *
     * @param membership proof from the guard; the only way to obtain one is to have been authorized
     */
    @Transactional(readOnly = true)
    public Itinerary view(Membership membership) {
        return itineraries
                .findById(membership.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }

    /**
     * Points the itinerary's denormalised {@code ownerId} at the new owner (S1.6) — one third of an
     * ownership transfer, called by the membership module inside the transfer's transaction.
     *
     * <p><strong>{@link Propagation#MANDATORY}</strong>, like every other participant in a multi-module
     * write here: this must land with the role swap and the transfer record or not at all. A column that
     * committed alone would name an owner the membership rows disagree with — and since nothing reads
     * this column on the request path, the disagreement would be invisible until something did.
     *
     * <p><strong>Why sync at all, when nothing reads it.</strong> Because the alternative is a column
     * whose name lies, silently, forever (the V3 {@code state DEFAULT 'draft'} shape). Keeping it true
     * also leaves E4's "(Creator)" question genuinely open — creator is derivable from the transfer
     * records, current owner from here — where a frozen column would have pre-decided it by accident.
     *
     * <p>No {@link Membership} parameter: this is not an act a traveler performs on an itinerary, it is
     * a consequence of one performed on a workspace. The authority was established by the offer ladder
     * before the transaction opened, exactly as {@code formAround} takes no membership because it is the
     * act that creates one.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reassignOwner(UUID itineraryId, UUID newOwnerId) {
        Itinerary itinerary =
                itineraries
                        .findById(itineraryId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No itinerary " + itineraryId + " to reassign — invariant breach"));
        itinerary.reassignOwner(newOwnerId);
        itineraries.saveAndFlush(itinerary);
    }

    /**
     * Whether the trip has been marked complete (S1.9) — the one fact unarchive needs from this module.
     *
     * <p>Unarchiving <em>recomputes</em> the workspace's state rather than remembering it (spec decision
     * 8), and this is the input to that computation: a completed trip's workspace comes back {@code
     * COMPLETED}, anything else {@code ACTIVE}. Exposed as a boolean rather than the state itself
     * deliberately — the caller needs one bit, and handing another module the whole lifecycle enum
     * invites it to start branching on states it has no business knowing about.
     *
     * <p>False for an itinerary that does not exist, which cannot happen through the archive path (the
     * guard authorized it) and would mean {@code ACTIVE} if it somehow did — the safe direction: a trip
     * wrongly restored as live can be completed again, while one wrongly restored as completed would
     * need a state the forward-only machine cannot leave.
     */
    @Transactional(readOnly = true)
    public boolean isCompleted(UUID itineraryId) {
        return itineraries
                .findById(itineraryId)
                .map(itinerary -> itinerary.state() == ItineraryState.COMPLETED)
                .orElse(false);
    }

    /**
     * The itinerary the guard authorized, with its day/activity plan embedded (S1.3).
     *
     * <p>The single-fetch composition: {@link #view} for the root, {@link DayService#plan} for the
     * days-and-activities tree beneath it. Kept here rather than in the controller because Day is part
     * of <em>this</em> aggregate (ADR-013) — the itinerary module composes its own aggregate's view,
     * and the controller stays transport (it never learns there is a {@code DayService}).
     */
    @Transactional(readOnly = true)
    public ItineraryPlan viewPlan(Membership membership) {
        return new ItineraryPlan(
                view(membership),
                days.plan(membership.itineraryId()),
                // The workspace's fact, asked for by id (ADR-002) — see ItineraryPlan on why the
                // composition happens in a read-model rather than on the aggregate.
                workspaces.isArchived(membership.itineraryId()));
    }

    /**
     * Edits the itinerary's own fields — title, destinations, description, dates (S1.3, ticket 04).
     * Any member (spec Q8: members shape the plan); the {@link Membership} is the authority and the
     * editor recorded.
     *
     * <p>Whole-field, last-write-wins, attribution stamped — the {@code Activity.edit} shape at the
     * root. Lifecycle, ownership and visibility are untouched: those are owner-only acts with their own
     * stories, and this method offers no way to reach them.
     *
     * @return the edited itinerary (the controller composes the plan back on for the response)
     */
    @Transactional
    public Itinerary editFields(
            Membership member,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        // The single-writer lock (S1.4, ADR-014): this caller must hold the live edit lease, or the
        // write is refused with a 409 naming the holder. Runs after the guard (which resolved the
        // membership at the controller) — so a non-member is already 404-masked and never reaches here.
        editLease.requireHeldBy(member);
        Itinerary itinerary =
                itineraries
                        .findById(member.itineraryId())
                        .orElseThrow(() -> new IllegalStateException(
                                "The guard authorized a membership for an itinerary that does not exist"));
        itinerary.editFields(title, destinations, description, startDate, endDate, member.travelerId(), Instant.now());
        itineraries.save(itinerary);
        log.info("Itinerary edited: id={} editor={}", itinerary.id(), member.travelerId());
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("itinerary_field_edited")
                                        .with("itineraryId", itinerary.id())
                                        .with("travelerId", member.travelerId())
                                        .with("hasDates", itinerary.startDate() != null || itinerary.endDate() != null)
                                        .with("destinationCount", itinerary.destinations().size())
                                        .build()));
        return itinerary;
    }

    /**
     * The owner starts the trip (S1.7): {@code draft → active}, stamping when they said so.
     *
     * <p><strong>Owner-only, and the check is on the capability object</strong> — {@code
     * membership.isOwner()}, never a re-read of {@code itinerary.ownerId} (which is a mirror, not the
     * authority — see {@link #reassignOwner}). Authority before state, S1.5's ordering: a member who is
     * not the owner gets 403 whether or not the transition would have been legal, so the refusal never
     * leaks the trip's lifecycle state to someone without standing to change it.
     *
     * <p><strong>No edit lease</strong> (ADR-014, spec decision 10). The lease is the single-writer lock
     * on <em>plan content</em>; a lifecycle transition is a governance act, like S1.5's removal and
     * S1.6's transfer, and neither takes it. Requiring one would mean the owner had to seize the
     * editing lock from a member mid-edit just to say the trip has begun.
     *
     * <p><strong>The last-edited pair is untouched</strong> for the same reason — it attributes plan
     * edits (S1.3), and starting a trip edits nothing about the plan.
     *
     * @param owner proof from the guard; must be the {@code OWNER} membership
     */
    @Transactional
    public Itinerary start(Membership owner) {
        Itinerary itinerary = authorizeAndLoad(owner);
        itinerary.start(Instant.now());
        return record(itinerary, owner, "itinerary_started");
    }

    /**
     * The owner marks the trip complete (S1.7): {@code active → completed}.
     *
     * <p>Same authority, same lease and attribution reasoning as {@link #start}. The legality half —
     * only from {@code ACTIVE}, no skip edge from {@code draft} — lives on the aggregate, which is
     * where the state machine belongs; see {@link Itinerary#complete}.
     *
     * <p><strong>Completion gates nothing</strong> (S1.7 spec decision 2): plan edits, invites, removal
     * and transfer all keep working afterwards — canon's workspace afterlife is <em>working</em>, not
     * frozen. This method records a fact; it does not lock a door. The fact's first reader is S4.1's
     * publish gate. (S1.9's archive is the state that <em>does</em> freeze writes, and it is a separate
     * act on a separate machine.)
     *
     * <p><strong>The workspace mirror, added at S1.9</strong> (canon's {@code active → completed} edge,
     * whose trigger is literally "mirrors the itinerary completing"). It rides inside this transaction
     * so the two sides of a 1:1 cannot disagree; see {@link WorkspaceService#markCompleted} for why a
     * derivable value is nonetheless written down. {@code start} has no mirror because the workspace
     * machine has no state below {@code ACTIVE} — a draft trip's workspace is already active, which is
     * register #12's resolution.
     *
     * @param owner proof from the guard; must be the {@code OWNER} membership
     */
    @Transactional
    public Itinerary complete(Membership owner) {
        Itinerary itinerary = authorizeAndLoad(owner);
        itinerary.complete(Instant.now());
        workspaces.markCompleted(itinerary.id());
        return record(itinerary, owner, "itinerary_completed");
    }

    /**
     * Authority before state (S1.5's ordering), then the row — the half of a transition that must be
     * identical for every edge, so it is written once.
     *
     * <p>The role check comes first deliberately: a member who is not the owner is refused whether or
     * not the transition would have been legal, so the 403 never depends on — and never leaks — the
     * trip's current lifecycle state.
     */
    private Itinerary authorizeAndLoad(Membership owner) {
        if (!owner.isOwner()) {
            throw new NotTripOwnerException();
        }
        // S1.9: an archived trip's lifecycle is frozen with everything else on it. After the role
        // check, so a member without standing still gets 403 rather than learning the trip's state.
        fence.requireWritable(owner);
        return itineraries
                .findById(owner.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }

    /**
     * Persists a completed transition and reports it — the other half both edges share.
     *
     * <p>Reached only if the aggregate accepted the edge: an illegal transition throws inside {@code
     * start}/{@code complete} before this is called, so nothing is saved, nothing is logged, and <em>no
     * event fires for a refused transition</em> (spec AC 6). The emission is after-commit for the reason
     * {@link #emitAfterCommit} records — a rolled-back transaction must not leave a funnel counting a
     * trip that never started.
     *
     * <p>Attributes are ids only (P3): which trip, which traveler. The event's <em>name</em> already
     * carries which transition happened, so no state attribute is needed to disambiguate.
     */
    private Itinerary record(Itinerary itinerary, Membership owner, String eventName) {
        itineraries.save(itinerary);
        log.info(
                "Itinerary lifecycle: id={} state={} owner={}",
                itinerary.id(),
                itinerary.state().wireName(),
                owner.travelerId());
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(eventName)
                                        .with("itineraryId", itinerary.id())
                                        .with("travelerId", owner.travelerId())
                                        .build()));
        return itinerary;
    }

    /**
     * The trips the caller is a member of — owned and joined, one list, newest first.
     *
     * <p><strong>No {@link Membership} here, and it is not a hole.</strong> The guard answers "may
     * this traveler touch that itinerary?" — a question about one object. A list has no object yet;
     * the membership filter <em>is</em> the authorization, applied in the query itself, so an itinerary
     * the caller is not on cannot enter the result at all.
     *
     * <p><strong>Membership-scoped since S1.6 (ticket 03), and the change is a bug fix.</strong> This
     * read was owner-scoped from S0.3, when owner and member were the same person. S1.2 made them
     * different and nobody revisited it, so from that release a traveler who accepted an invitation got
     * <em>zero rows</em> for a trip they could open, read and edit perfectly — found only at S1.5's
     * two-device walk, because every guard IT addresses an itinerary by id and every earlier device
     * walk drove the owner's phone. S1.6 forces the fix: after a transfer the former owner would
     * otherwise lose a trip they are still on.
     *
     * <p>One merged list rather than owned/joined sections (spec decision 2): since S1.1 every owner
     * holds a membership row, so "trips I own" is a subset of "trips I'm on" and the merge needs no
     * union and no role column on the wire. The ids come from the workspace module by service
     * interface — this module never reads a membership table (ADR-002).
     *
     * <p><strong>The limit is clamped, not rejected</strong> (spec): a clamped list is still a
     * correct list, and a 400 for {@code limit=500} would be a contract nobody benefits from. Old
     * clients also never break if the cap is raised later.
     *
     * <p><strong>Archived trips are excluded by default since S1.9</strong> — {@code archived} narrows
     * the id set the workspace module hands over, before any paging happens. The filter sits there
     * rather than in the page queries below for a structural reason: adding a predicate to a keyset
     * query means the predicate has to be stable across pages (or be carried in the cursor), whereas
     * narrowing the id set leaves {@code id < cursor} exactly as S1.6 shipped it. It also keeps a
     * workspace fact out of this module's SQL (ADR-002).
     *
     * @param cursor {@code null} for the first page; otherwise an opaque cursor this API issued
     * @param archived {@code false} for the default My Trips list, {@code true} for the archived view
     */
    @Transactional(readOnly = true)
    public Page<Itinerary> listMine(UUID travelerId, String cursor, Integer requestedLimit, boolean archived) {
        int limit = clamp(requestedLimit);
        // Decode BEFORE the empty short-circuit below, so a malformed cursor is rejected the same way
        // for everyone. Decoding after would make input validation depend on the caller's data: a
        // traveler with trips would get 400 and a traveler with none would get 200 for the identical
        // request — one bad input, two answers, which is the check-with-no-failure-mode shape this repo
        // keeps getting burned by. (Caught by ItineraryListIT's malformed-cursor test, which happens to
        // use a traveler with no trips.)
        UUID decodedCursor = cursor == null ? null : Cursor.decode(cursor);

        List<UUID> itineraryIds = workspaces.itineraryIdsFor(travelerId, archived);
        if (itineraryIds.isEmpty()) {
            // A traveler on no trips is the ordinary first-run state, not an edge case — and `IN ()` is
            // not valid SQL, so this must not reach the query.
            return Page.exhausted(List.of());
        }
        // One row more than asked for: its presence is what says "there is a next page", and it
        // costs one row rather than a second COUNT query against the same index.
        Limit probe = Limit.of(limit + 1);
        List<Itinerary> found =
                decodedCursor == null
                        ? itineraries.findFirstPage(itineraryIds, probe)
                        : itineraries.findPageAfter(itineraryIds, decodedCursor, probe);

        if (found.size() <= limit) {
            return Page.exhausted(found);
        }
        List<Itinerary> page = found.subList(0, limit);
        return Page.of(page, Cursor.encode(page.getLast().id()));
    }

    /**
     * The titles of a set of itineraries, keyed by id (S1.2, composing invitation-inbox cards).
     *
     * <p>Exposed as a service method rather than a table other modules read (ADR-002): the invitation
     * module holds {@code workspace_id}, resolves it to an itinerary id through the workspace module,
     * and asks here for the human name of the trip — never touching {@code itinerary} directly. A
     * title is not workspace-walled the way itinerary <em>contents</em> are; it is the label an
     * invitee needs to recognise which trip they were asked into, and it is all this hands over.
     */
    @Transactional(readOnly = true)
    public Map<UUID, String> titlesByIds(Collection<UUID> itineraryIds) {
        return itineraries.findAllById(itineraryIds).stream()
                .collect(Collectors.toMap(Itinerary::id, Itinerary::title));
    }

    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }

    /**
     * Emits the create event once the transaction has actually committed.
     *
     * <p>Emitting inline would report itineraries that a later rollback erases — a funnel counting
     * trips that do not exist. The synchronization also keeps telemetry off the transaction's
     * critical path, and {@link Analytics#emit} swallows its own failures, so a broken sink cannot
     * reach the traveler either way.
     *
     * <p>Attributes are ids and shape only — never the title or the destinations (P3). What the
     * funnel needs is "did anyone plan anything, with how many destinations, with dates or without";
     * what a traveler called their trip is their business, and a log line outlives the request by
     * whatever the retention happens to be.
     */
    private void emitAfterCommit(Itinerary itinerary) {
        AnalyticsEvent event =
                AnalyticsEvent.named("itinerary_created")
                        .with("travelerId", itinerary.ownerId())
                        .with("itineraryId", itinerary.id())
                        .with("hasDates", itinerary.startDate() != null || itinerary.endDate() != null)
                        .with("destinationCount", itinerary.destinations().size())
                        .build();
        AfterCommit.run(() -> analytics.emit(event));
    }
}
