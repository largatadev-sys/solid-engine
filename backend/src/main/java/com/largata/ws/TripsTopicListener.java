package com.largata.ws;

import com.largata.trip.api.EditingSessionChanged;
import com.largata.trip.api.PlanSaved;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;


@Component
class TripsTopicListener {

    private final EventFanout fanout;

    TripsTopicListener(EventFanout fanout) {
        this.fanout = fanout;
    }


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void onEditingSessionChanged(EditingSessionChanged changed) {
        String type =
                changed.holder() == null
                        ? TripEventTypes.EDITING_SESSION_RELEASED
                        : TripEventTypes.EDITING_SESSION_ACQUIRED;
        broadcast(
                changed.tripId(),
                type,
                new EditingSessionFrame(changed.tripId(), holderFrameOf(changed.holder())));
    }


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void onPlanSaved(PlanSaved saved) {
        broadcast(
                saved.tripId(),
                TripEventTypes.PLAN_SAVED,
                new PlanSavedFrame(
                        saved.tripId(), saved.planVersion(), saved.dayCount(), saved.lastEditedAt()));
    }


    private void broadcast(UUID tripId, String type, Object payload) {
        fanout.broadcast(Topic.ofItinerary(tripId, TopicSubscriptions.TRIPS_CHANNEL), type, payload);
    }


    private static HolderFrame holderFrameOf(EditingSessionChanged.Holder holder) {
        return holder == null
                ? null
                : new HolderFrame(
                        holder.travelerId(),
                        holder.handle(),
                        holder.displayName(),
                        holder.avatarUrl(),
                        holder.expiresAt());
    }


    record EditingSessionFrame(UUID itineraryId, HolderFrame editingSession) {}


    record PlanSavedFrame(UUID itineraryId, long planVersion, int dayCount, Instant lastEditedAt) {}


    record HolderFrame(
            UUID travelerId, String handle, String displayName, String avatarUrl, Instant expiresAt) {}
}
