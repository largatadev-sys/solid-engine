package com.largata.trip.fork;

import com.largata.common.analytics.Analytics;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.trip.api.ForkApi;
import com.largata.trip.api.ForkApi.ForkProvenanceView;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.plan.entity.Day;
import com.largata.trip.plan.entity.Activity;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.plan.repository.DayRepository;
import com.largata.trip.plan.repository.ActivityRepository;
import com.largata.trip.plan.service.DayService;

@Service
public class ForkService implements ForkApi {

    private static final Logger log = LoggerFactory.getLogger(ForkService.class);

    private final TripRepository trips;
    private final DayRepository days;
    private final ActivityRepository activities;
    private final DayService plans;
    private final ForkRelationshipRepository relationships;
    private final AuthorizationGuard guard;
    private final ForkApi.SourceVisibility sourceVisibility;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final Analytics analytics;

    ForkService(
            TripRepository trips,
            DayRepository days,
            ActivityRepository activities,
            DayService plans,
            ForkRelationshipRepository relationships,
            AuthorizationGuard guard,
            ForkApi.SourceVisibility sourceVisibility,
            WorkspaceService workspaces,
            TravelerService travelers,
            Analytics analytics) {
        this.trips = trips;
        this.days = days;
        this.activities = activities;
        this.plans = plans;
        this.relationships = relationships;
        this.guard = guard;
        this.sourceVisibility = sourceVisibility;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.analytics = analytics;
    }

    private void copyPlanInto(UUID copyId, UUID sourceId, UUID forkerId, Instant at) {
        for (Day sourceDay : days.findByItineraryIdOrderByOrdinalAsc(sourceId)) {
            Day copiedDay = days.save(Day.copiedInto(copyId, sourceDay, at));
            for (Activity sourceActivity : activities.findByDayIdOrderBySortOrderAscIdAsc(sourceDay.id())) {
                activities.save(Activity.copiedInto(copiedDay.id(), sourceActivity, forkerId, at));
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ForkProvenanceView> provenanceOf(UUID itineraryId, UUID readerId) {
        return relationships
                .findByForkedItineraryId(itineraryId)
                .map(ForkRelationship::sourceItineraryId)
                .map(
                        sourceId -> new ForkProvenanceView(
                                sourceId,
                                handleOfOwnerOf(sourceId),
                                sourceVisibility.stillLive(sourceId)));
    }

    private String handleOfOwnerOf(UUID sourceId) {
        return sourceVisibility
                .ownerOf(sourceId)
                .flatMap(travelers::summaryById)
                .map(TravelerSummary::handle)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public long forkCountOf(UUID sourceItineraryId) {
        return relationships.countBySourceItineraryId(sourceItineraryId);
    }

    @Override
    @Transactional
    public void recordFork(UUID sourceId, UUID forkedTripId) {
        relationships.save(ForkRelationship.recording(sourceId, forkedTripId, Instant.now()));
    }

    public record ForkProvenance(UUID sourceItineraryId, String ownerHandle, boolean sourceVisible) {
    }
}
