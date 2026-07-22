package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.Membership;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final Analytics analytics;

    ItineraryService(ItineraryRepository itineraries, WorkspaceService workspaces, Analytics analytics) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
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
    @Transactional
    public Itinerary create(
            UUID ownerId, String title, List<String> destinations, LocalDate startDate, LocalDate endDate) {
        Itinerary itinerary =
                itineraries.save(Itinerary.draft(ownerId, title, destinations, startDate, endDate, Instant.now()));
        // The itinerary's own instant, not now(): the workspace exists from the trip's first moment.
        workspaces.formAround(itinerary.id(), itinerary.ownerId(), itinerary.createdAt());
        // The operational line (06b §4: one info line on success, entity id + operation). Distinct
        // from the analytics event below and not a substitute for it: this one answers "what did the
        // system do at 14:02" for an operator reading the app's own log; that one feeds a funnel and
        // rides a separate, separately-routable logger. Ids only, never the title (P3).
        log.info("Itinerary created: id={} ownerId={}", itinerary.id(), itinerary.ownerId());
        emitAfterCommit(itinerary);
        return itinerary;
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
     * The caller's own itineraries, newest first.
     *
     * <p><strong>No {@link Membership} here, and it is not a hole.</strong> The guard answers "may
     * this traveler touch that itinerary?" — a question about one object. A list has no object yet;
     * the owner filter <em>is</em> the authorization, applied in the query itself, so an itinerary
     * that is not the caller's cannot enter the result at all. (E1's "workspaces I belong to" list
     * is the same shape: filtered by membership rows, not guarded per row.)
     *
     * <p><strong>The limit is clamped, not rejected</strong> (spec): a clamped list is still a
     * correct list, and a 400 for {@code limit=500} would be a contract nobody benefits from. Old
     * clients also never break if the cap is raised later.
     *
     * @param cursor {@code null} for the first page; otherwise an opaque cursor this API issued
     */
    @Transactional(readOnly = true)
    public Page<Itinerary> listMine(UUID travelerId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        // One row more than asked for: its presence is what says "there is a next page", and it
        // costs one row rather than a second COUNT query against the same index.
        Limit probe = Limit.of(limit + 1);
        List<Itinerary> found =
                cursor == null
                        ? itineraries.findFirstPage(travelerId, probe)
                        : itineraries.findPageAfter(travelerId, Cursor.decode(cursor), probe);

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

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // No transaction to wait for (a direct service call in a test, say) — emit now rather
            // than silently drop the event.
            analytics.emit(event);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        analytics.emit(event);
                    }
                });
    }
}
