package com.largata.trip.destruction;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.trip.api.TripApi;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.exception.TripNotFoundException;
import com.largata.trip.ownership.service.OwnershipRows;
import com.largata.trip.plan.service.PlanRows;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.trip.service.TripRows;
import com.largata.trip.workspace.service.WorkspaceRows;


@Service
class TripDestructionService {

    private static final Logger log = LoggerFactory.getLogger(TripDestructionService.class);

    private final TripApi trips;
    private final TripRows tripRows;
    private final PlanRows planRows;
    private final WorkspaceRows workspaceRows;
    private final OwnershipRows ownershipRows;
    private final ForeignWorkspaceRows foreignRows;
    private final PhotoService photos;
    private final Analytics analytics;

    TripDestructionService(
            TripApi trips,
            TripRows tripRows,
            PlanRows planRows,
            WorkspaceRows workspaceRows,
            OwnershipRows ownershipRows,
            ForeignWorkspaceRows foreignRows,
            PhotoService photos,
            Analytics analytics) {
        this.trips = trips;
        this.tripRows = tripRows;
        this.planRows = planRows;
        this.workspaceRows = workspaceRows;
        this.ownershipRows = ownershipRows;
        this.foreignRows = foreignRows;
        this.photos = photos;
        this.analytics = analytics;
    }


    @Transactional
    public void destroy(Membership member) {
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can delete this trip.");
        }
        UUID tripId = member.itineraryId();
        trips.factsOf(tripId).orElseThrow(TripNotFoundException::new);

        destroyWorkspaceMedia(tripId);
        foreignRows.deleteChatOf(tripId);
        workspaceRows.idOf(tripId).ifPresent(this::destroyWorkspaceWorld);
        tripRows.delete(tripId);

        log.info("Trip destroyed: tripId={} ownerId={}", tripId, member.travelerId());
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("trip_destroyed")
                                        .with("tripId", tripId)
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }


    private void destroyWorkspaceMedia(UUID tripId) {
        planRows.activityIdsUnder(tripId)
                .forEach(activityId -> destroyPhotosOf(PhotoSubject.ACTIVITY, activityId));
        destroyPhotosOf(PhotoSubject.ITINERARY_PHOTO_DUMP, tripId);
        destroyPhotosOf(PhotoSubject.ITINERARY_COVER, tripId);
    }


    private void destroyPhotosOf(PhotoSubject subject, UUID subjectId) {
        photos.allOf(subject, subjectId).forEach(photo -> photos.delete(photo.id()));
    }


    private void destroyWorkspaceWorld(UUID workspaceId) {
        foreignRows.deleteEverythingHangingOff(workspaceId);
        ownershipRows.deleteEverythingHangingOff(workspaceId);
        workspaceRows.deleteMembershipsOf(workspaceId);
        workspaceRows.delete(workspaceId);
    }
}
