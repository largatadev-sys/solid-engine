package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.workspace.WorkspaceService;
import com.largata.workspace.WorkspaceState;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ForkService {

    private static final Logger log = LoggerFactory.getLogger(ForkService.class);

    private final ItineraryRepository itineraries;
    private final DayRepository days;
    private final ActivityRepository activities;
    private final DayService plans;
    private final ForkRelationshipRepository relationships;
    private final AuthorizationGuard guard;
    private final WorkspaceService workspaces;
    private final PublishedVisibility visibility;
    private final TravelerService travelers;
    private final Analytics analytics;

    ForkService(
            ItineraryRepository itineraries,
            DayRepository days,
            ActivityRepository activities,
            DayService plans,
            ForkRelationshipRepository relationships,
            AuthorizationGuard guard,
            WorkspaceService workspaces,
            PublishedVisibility visibility,
            TravelerService travelers,
            Analytics analytics) {
        this.itineraries = itineraries;
        this.days = days;
        this.activities = activities;
        this.plans = plans;
        this.relationships = relationships;
        this.guard = guard;
        this.workspaces = workspaces;
        this.visibility = visibility;
        this.travelers = travelers;
        this.analytics = analytics;
    }


    @Transactional
    public ItineraryPlan fork(UUID sourceId, UUID forkerId, Optional<Membership> caller) {
        Itinerary source = visibility.require(sourceId, caller);
        Instant at = Instant.now();

        Itinerary copy = itineraries.save(Itinerary.forkedFrom(source, forkerId, at));
        workspaces.formAround(copy.id(), forkerId, at);
        copyPlanInto(copy.id(), source.id(), forkerId, at);
        relationships.save(ForkRelationship.recording(source.id(), copy.id(), at));

        log.info("Itinerary forked: sourceId={} forkedId={} forkerId={}", source.id(), copy.id(), forkerId);
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("itinerary_forked")
                                        .with("itineraryId", copy.id())
                                        .with("sourceItineraryId", source.id())
                                        .with("travelerId", forkerId)
                                        .build()));

        return new ItineraryPlan(
                copy,
                plans.plan(copy.id()),
                workspaces.stateOf(copy.id()).orElse(WorkspaceState.ACTIVE),
                Map.of(),
                Map.of());
    }


    private void copyPlanInto(UUID copyId, UUID sourceId, UUID forkerId, Instant at) {
        for (Day sourceDay : days.findByItineraryIdOrderByOrdinalAsc(sourceId)) {
            Day copiedDay = days.save(Day.copiedInto(copyId, sourceDay, at));
            for (Activity sourceActivity : activities.findByDayIdOrderBySortOrderAscIdAsc(sourceDay.id())) {
                activities.save(Activity.copiedInto(copiedDay.id(), sourceActivity, forkerId, at));
            }
        }
    }


    @Transactional(readOnly = true)
    public Optional<ForkProvenance> provenanceOf(UUID itineraryId, UUID readerId) {
        return relationships
                .findByForkedItineraryId(itineraryId)
                .map(ForkRelationship::sourceItineraryId)
                .map(
                        sourceId ->
                                new ForkProvenance(
                                        sourceId,
                                        handleOfOwnerOf(sourceId),
                                        visibility.admits(sourceId, guard.membershipOf(readerId, sourceId))));
    }


    private String handleOfOwnerOf(UUID sourceId) {
        return workspaces
                .ownerOf(sourceId)
                .flatMap(travelers::summaryById)
                .map(TravelerSummary::handle)
                .orElse(null);
    }


    @Transactional(readOnly = true)
    public long forkCountOf(UUID sourceItineraryId) {
        return relationships.countBySourceItineraryId(sourceItineraryId);
    }


    public record ForkProvenance(UUID sourceItineraryId, String ownerHandle, boolean sourceVisible) {}
}
