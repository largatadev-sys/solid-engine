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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TripDestructionService {

    private static final Logger log = LoggerFactory.getLogger(TripDestructionService.class);

    private final JdbcClient db;
    private final PhotoService photos;
    private final TripApi trips;
    private final Analytics analytics;

    TripDestructionService(
            JdbcClient db, PhotoService photos, TripApi trips, Analytics analytics) {
        this.db = db;
        this.photos = photos;
        this.trips = trips;
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
        db.sql("DELETE FROM chat_message WHERE itinerary_id = ?").param(tripId).update();
        workspaceIdOf(tripId).ifPresent(this::destroyWorkspaceWorld);
        db.sql("DELETE FROM itinerary WHERE id = ?").param(tripId).update();

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
        db.sql("SELECT a.id FROM activity a JOIN day d ON d.id = a.day_id WHERE d.itinerary_id = ?")
                .param(tripId)
                .query(UUID.class)
                .list()
                .forEach(activityId -> destroyPhotosOf(PhotoSubject.ACTIVITY, activityId));
        destroyPhotosOf(PhotoSubject.ITINERARY_PHOTO_DUMP, tripId);
        destroyPhotosOf(PhotoSubject.ITINERARY_COVER, tripId);
    }


    private void destroyPhotosOf(PhotoSubject subject, UUID subjectId) {
        photos.allOf(subject, subjectId).forEach(photo -> photos.delete(photo.id()));
    }


    private Optional<UUID> workspaceIdOf(UUID tripId) {
        return db.sql("SELECT id FROM workspace WHERE itinerary_id = ?")
                .param(tripId)
                .query(UUID.class)
                .optional();
    }


    private void destroyWorkspaceWorld(UUID workspaceId) {
        for (String workspaceTable :
                List.of(
                        "poll",
                        "invitation",
                        "join_request",
                        "join_link",
                        "ownership_offer",
                        "ownership_transfer",
                        "membership")) {
            db.sql("DELETE FROM " + workspaceTable + " WHERE workspace_id = ?")
                    .param(workspaceId)
                    .update();
        }
        db.sql("DELETE FROM workspace WHERE id = ?").param(workspaceId).update();
    }
}
