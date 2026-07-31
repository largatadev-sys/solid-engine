package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.workspace.WorkspaceService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ItineraryService {

    private static final Logger log = LoggerFactory.getLogger(ItineraryService.class);


    private static final int DEFAULT_PAGE_SIZE = 20;

    private static final int MAX_PAGE_SIZE = 100;

    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;
    private final DayService days;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final TravelerService travelers;
    private final WriteFence fence;
    private final Analytics analytics;

    ItineraryService(
            ItineraryRepository itineraries,
            WorkspaceService workspaces,
            DayService days,
            EditLeaseService editLease,
            ActivityHistoryService history,
            TravelerService travelers,
            WriteFence fence,
            Analytics analytics) {
        this.itineraries = itineraries;
        this.workspaces = workspaces;
        this.days = days;
        this.editLease = editLease;
        this.history = history;
        this.travelers = travelers;
        this.fence = fence;
        this.analytics = analytics;
    }



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
        workspaces.formAround(itinerary.id(), itinerary.ownerId(), itinerary.createdAt());
        days.seedDays(itinerary.id(), durationDays, itinerary.createdAt());
        log.info("Itinerary created: id={} ownerId={}", itinerary.id(), itinerary.ownerId());
        emitAfterCommit(itinerary);
        return itinerary;
    }


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
        return assemble(itinerary, days.plan(itinerary.id()), false);
    }


    @Transactional(readOnly = true)
    public Itinerary view(Membership membership) {
        return itineraries
                .findById(membership.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }


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


    @Transactional(readOnly = true)
    public boolean isCompleted(UUID itineraryId) {
        return itineraries
                .findById(itineraryId)
                .map(itinerary -> itinerary.state() == ItineraryState.COMPLETED)
                .orElse(false);
    }


    @Transactional(readOnly = true)
    public ItineraryPlan viewPlan(Membership membership) {
        return assemble(
                view(membership),
                days.plan(membership.itineraryId()),
                workspaces.isArchived(membership.itineraryId()));
    }


    private ItineraryPlan assemble(Itinerary itinerary, List<DayView> plan, boolean archived) {
        Set<UUID> editorIds = new LinkedHashSet<>();
        if (itinerary.lastEditedBy() != null) {
            editorIds.add(itinerary.lastEditedBy());
        }
        plan.forEach(
                day ->
                        day.activities().stream()
                                .map(ActivityView::lastEditedBy)
                                .filter(Objects::nonNull)
                                .forEach(editorIds::add));
        Map<UUID, TravelerSummary> editors =
                editorIds.isEmpty()
                        ? Map.of()
                        : travelers.summariesByIds(editorIds).stream()
                                .collect(Collectors.toMap(TravelerSummary::id, Function.identity()));
        return new ItineraryPlan(itinerary, plan, archived, editLease.liveHoldersFor(itinerary.id()), editors);
    }


    @Transactional
    public Itinerary editFields(
            Membership member,
            String title,
            List<String> destinations,
            String description,
            LocalDate startDate,
            LocalDate endDate) {
        editLease.requireHeldBy(member, LeaseSubject.header(member.itineraryId()));
        Itinerary itinerary =
                itineraries
                        .findById(member.itineraryId())
                        .orElseThrow(() -> new IllegalStateException(
                                "The guard authorized a membership for an itinerary that does not exist"));
        itinerary.editFields(title, destinations, description, startDate, endDate, member.travelerId(), Instant.now());
        itineraries.save(itinerary);
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(itinerary.id()));
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


    @Transactional
    public Itinerary start(Membership owner) {
        Itinerary itinerary = authorizeAndLoad(owner);
        itinerary.start(Instant.now());
        return record(itinerary, owner, "itinerary_started");
    }


    @Transactional
    public Itinerary complete(Membership owner) {
        Itinerary itinerary = authorizeAndLoad(owner);
        itinerary.complete(Instant.now());
        workspaces.markCompleted(itinerary.id());
        return record(itinerary, owner, "itinerary_completed");
    }


    private Itinerary authorizeAndLoad(Membership owner) {
        if (!owner.isOwner()) {
            throw new NotTripOwnerException();
        }
        fence.requireWritable(owner);
        return itineraries
                .findById(owner.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }


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


    @Transactional(readOnly = true)
    public Page<Itinerary> listMine(UUID travelerId, String cursor, Integer requestedLimit, boolean archived) {
        int limit = clamp(requestedLimit);
        UUID decodedCursor = cursor == null ? null : Cursor.decode(cursor);

        List<UUID> itineraryIds = workspaces.itineraryIdsFor(travelerId, archived);
        if (itineraryIds.isEmpty()) {
            return Page.exhausted(List.of());
        }
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
