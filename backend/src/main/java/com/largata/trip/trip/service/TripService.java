package com.largata.trip.trip.service;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.Membership;
import com.largata.common.authz.PublicationState;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.trip.api.TripTeaser;
import com.largata.trip.workspace.entity.WorkspaceState;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.history.ActivityHistoryService;
import com.largata.trip.plan.entity.TripPlanTree;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.history.HistoryAct;
import com.largata.trip.api.TripLifecycle;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.plan.repository.ActivityRepository;
import com.largata.trip.plan.service.DayService;
import com.largata.trip.editing.service.EditLeaseService;
import com.largata.trip.plan.service.DayView;
import com.largata.trip.plan.service.ActivityView;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.trip.entity.TripFields;
import com.largata.trip.trip.entity.TripCategory;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.trip.exception.IllegalStateTransitionException;


@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);


    private static final int DEFAULT_PAGE_SIZE = 20;

    private static final int MAX_PAGE_SIZE = 100;

    private final TripRepository trips;
    private final ActivityRepository activities;
    private final WorkspaceService workspaces;
    private final DayService days;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final TravelerService travelers;
    private final WriteFence fence;
    private final Analytics analytics;
    private final ShareCardVersionService shareCardVersions;
    private final PublicationState publication;

    TripService(
            TripRepository trips,
            ActivityRepository activities,
            WorkspaceService workspaces,
            DayService days,
            EditLeaseService editLease,
            ActivityHistoryService history,
            TravelerService travelers,
            WriteFence fence,
            Analytics analytics,
            ShareCardVersionService shareCardVersions,
            PublicationState publication) {
        this.trips = trips;
        this.activities = activities;
        this.workspaces = workspaces;
        this.days = days;
        this.editLease = editLease;
        this.history = history;
        this.travelers = travelers;
        this.fence = fence;
        this.analytics = analytics;
        this.shareCardVersions = shareCardVersions;
        this.publication = publication;
    }


    @Transactional
    public Trip create(
            UUID ownerId, String title, String destination, LocalDate startDate, LocalDate endDate) {
        return create(ownerId, title, destination, null, startDate, endDate, 0);
    }

    @Transactional
    public Trip create(
            UUID ownerId,
            String title,
            String destination,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            int durationDays) {
        return createWithPlan(
                        ownerId,
                        TripFields.withoutPublishMetadata(
                                title, destination, description, startDate, endDate),
                        durationDays)
                .itinerary();
    }


    @Transactional
    public TripPlanTree createWithPlan(UUID ownerId, TripFields fields, int durationDays) {
        Trip itinerary = trips.save(Trip.newTrip(ownerId, fields, Instant.now()));
        workspaces.formAround(itinerary.id(), itinerary.ownerId(), itinerary.createdAt());
        days.seedDays(itinerary.id(), durationDays, itinerary.createdAt());
        log.info("Trip created: id={} ownerId={}", itinerary.id(), itinerary.ownerId());
        emitAfterCommit(itinerary);
        return assemble(itinerary, days.plan(itinerary.id()));
    }


    @Transactional(readOnly = true)
    public Trip view(Membership membership) {
        return trips
                .findById(membership.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void reassignOwner(UUID itineraryId, UUID newOwnerId) {
        Trip itinerary =
                trips
                        .findById(itineraryId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No itinerary " + itineraryId + " to reassign — invariant breach"));
        itinerary.reassignOwner(newOwnerId);
        trips.saveAndFlush(itinerary);
    }


    @Transactional(readOnly = true)
    public boolean isCompleted(UUID itineraryId) {
        return trips
                .findById(itineraryId)
                .map(itinerary -> itinerary.state() == TripLifecycle.COMPLETED)
                .orElse(false);
    }


    @Transactional(readOnly = true)
    public TripPlanTree viewPlan(Membership membership) {
        return assemble(view(membership), days.plan(membership.itineraryId()));
    }


    @Transactional(readOnly = true)
    public WorkspaceState stateOf(UUID itineraryId) {
        return workspaces.stateOf(itineraryId).orElse(WorkspaceState.ACTIVE);
    }


    @Transactional(readOnly = true)
    public Set<UUID> ownedAmong(UUID travelerId, Collection<UUID> itineraryIds) {
        return workspaces.ownedAmong(travelerId, itineraryIds);
    }


    @Transactional(readOnly = true)
    public Map<UUID, Integer> memberCountsAmong(Collection<UUID> itineraryIds) {
        return workspaces.memberCountsAmong(itineraryIds);
    }


    private TripPlanTree assemble(Trip itinerary, List<DayView> plan) {
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
        return new TripPlanTree(
                itinerary,
                plan,
                stateOf(itinerary.id()),
                editLease.liveHoldersFor(itinerary.id()),
                editors,
                publication.liveFor(itinerary.id()));
    }


    @Transactional
    public Trip editFields(Membership member, UnaryOperator<TripFields> merge) {
        editLease.requireHeldBy(member, LeaseSubject.header(member.itineraryId()));
        Trip itinerary = loadForDetailsEdit(member);

        TripFields fields = merge.apply(fieldsOf(itinerary));

        String currencyBefore = itinerary.currency();
        ShareCardVersionService.CardInputs cardBefore =
                ShareCardVersionService.CardInputs.of(itinerary);
        itinerary.editFields(fields, member.travelerId(), Instant.now());
        trips.save(itinerary);

        if (!Objects.equals(currencyBefore, itinerary.currency())) {
            int relabelled = activities.relabelPricedActivities(itinerary.id(), itinerary.currency());
            log.info(
                    "Trip currency changed: id={} from={} to={} relabelledActivities={}",
                    itinerary.id(),
                    currencyBefore,
                    itinerary.currency(),
                    relabelled);
        }
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(itinerary.id()));
        log.info("Trip edited: id={} editor={}", itinerary.id(), member.travelerId());
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("itinerary_field_edited")
                                        .with("itineraryId", itinerary.id())
                                        .with("travelerId", member.travelerId())
                                        .with("hasDates", itinerary.startDate() != null || itinerary.endDate() != null)
                                        .with("currency", itinerary.currency())
                                        .build()));

        ShareCardVersionService.CardInputs cardAfter =
                ShareCardVersionService.CardInputs.of(itinerary);
        if (cardBefore.equals(cardAfter)) {
            return itinerary;
        }
        return shareCardVersions.bumpAndReload(itinerary.id());
    }


    private Trip loadForDetailsEdit(Membership member) {
        fence.requireEditable(member);
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can edit the trip's details.");
        }
        return trips
                .findById(member.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }


    private static TripFields fieldsOf(Trip itinerary) {
        return new TripFields(
                itinerary.title(),
                itinerary.destination(),
                itinerary.currency(),
                itinerary.description(),
                itinerary.standouts(),
                itinerary.bestTimeOfYear() == null ? "" : itinerary.bestTimeOfYear(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.pin());
    }


    @Transactional(readOnly = true)
    public void refuseFinishPlanning(Membership owner) {
        authorizeAndLoad(owner);
        throw IllegalStateTransitionException.planningIsNoLongerAState();
    }


    @Transactional
    public Trip start(Membership owner) {
        Trip itinerary = authorizeAndLoad(owner);
        editLease.requireSessionFreeForLifecycle(owner);
        itinerary.start(Instant.now());
        return record(itinerary, owner, "itinerary_started");
    }


    @Transactional
    public Trip complete(Membership owner) {
        Trip itinerary = authorizeAndLoad(owner);
        editLease.requireSessionFreeForLifecycle(owner);
        itinerary.complete(Instant.now());
        workspaces.markCompleted(itinerary.id());
        return record(itinerary, owner, "itinerary_completed");
    }


    @Transactional
    public Trip reopen(Membership owner) {
        Trip itinerary = authorizeAndLoad(owner);
        editLease.requireSessionFreeForLifecycle(owner);
        itinerary.reopen();
        workspaces.markActive(itinerary.id());
        return record(itinerary, owner, "itinerary_reopened");
    }


    @Transactional
    public Trip publish(Membership owner) {
        Trip itinerary = authorizeAndLoad(owner);
        editLease.requireSessionFreeForLifecycle(owner);
        itinerary.publishTo(Instant.now());
        return recordStatus(itinerary, owner, "itinerary_published");
    }


    @Transactional
    public Trip unpublish(Membership owner) {
        Trip itinerary = authorizeAndLoad(owner);
        itinerary.unpublish();
        return recordStatus(itinerary, owner, "itinerary_unpublished");
    }


    private Trip recordStatus(Trip itinerary, Membership owner, String eventName) {
        trips.save(itinerary);
        log.info(
                "Trip publication: id={} published={} owner={}",
                itinerary.id(),
                itinerary.isPublished(),
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


    private Trip authorizeAndLoad(Membership owner) {
        fence.requireWritable(owner);
        if (!owner.isOwner()) {
            throw NotTheTripOwnerException.toStartOrCompleteTheTrip();
        }
        return trips
                .findById(owner.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }


    private Trip record(Trip itinerary, Membership owner, String eventName) {
        trips.save(itinerary);
        log.info(
                "Trip lifecycle: id={} state={} owner={}",
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
    public Set<UUID> beingEditedAmong(Collection<UUID> itineraryIds) {
        return editLease.itinerariesBeingEdited(itineraryIds);
    }


    @Transactional(readOnly = true)
    public Map<UUID, Long> dayCountsAmong(Collection<UUID> itineraryIds) {
        return days.dayCountsOf(itineraryIds);
    }


    @Transactional(readOnly = true)
    public Page<Trip> listMine(
            UUID travelerId, String cursor, Integer requestedLimit, boolean archived, TripCategory category) {
        int limit = clamp(requestedLimit);
        UUID decodedCursor = cursor == null ? null : Cursor.decode(cursor);

        if (category != null && category.matchesNoState()) {
            return Page.exhausted(List.of());
        }
        List<UUID> itineraryIds = workspaces.itineraryIdsFor(travelerId, archived);
        if (itineraryIds.isEmpty()) {
            return Page.exhausted(List.of());
        }
        TripLifecycle state = category == null ? null : category.state().orElse(null);
        Limit probe = Limit.of(limit + 1);
        List<Trip> found =
                decodedCursor == null
                        ? trips.findFirstPage(itineraryIds, state, probe)
                        : trips.findPageAfter(itineraryIds, decodedCursor, state, probe);

        if (found.size() <= limit) {
            return Page.exhausted(found);
        }
        List<Trip> page = found.subList(0, limit);
        return Page.of(page, Cursor.encode(page.getLast().id()));
    }





    @Transactional(readOnly = true)
    public Map<UUID, String> titlesByIds(Collection<UUID> itineraryIds) {
        return trips.findAllById(itineraryIds).stream()
                .collect(Collectors.toMap(Trip::id, Trip::title));
    }


    @Transactional(readOnly = true)
    public Optional<TripTeaser> teaserOf(UUID itineraryId) {
        return trips.findById(itineraryId).map(TripService::teaserFrom);
    }


    private static TripTeaser teaserFrom(Trip itinerary) {
        return new TripTeaser(
                itinerary.id(),
                itinerary.title(),
                itinerary.destination(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.coverImageUrl(),
                itinerary.isPublished());
    }

    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }


    private void emitAfterCommit(Trip itinerary) {
        AnalyticsEvent event =
                AnalyticsEvent.named("itinerary_created")
                        .with("travelerId", itinerary.ownerId())
                        .with("itineraryId", itinerary.id())
                        .with("hasDates", itinerary.startDate() != null || itinerary.endDate() != null)
                        .with("currency", itinerary.currency())
                        .build();
        AfterCommit.run(() -> analytics.emit(event));
    }
}
