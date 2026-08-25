package com.largata.itinerary;

import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.api.LeaseHolderResponse;
import com.largata.ws.EventFanout;
import com.largata.ws.Topic;
import com.largata.ws.TopicSubscriptions;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class TripsTopic {

    public static final String EDITING_SESSION_ACQUIRED = "editing-session.acquired";

    public static final String EDITING_SESSION_RELEASED = "editing-session.released";

    public static final String PLAN_SAVED = "plan.saved";

    private final EventFanout fanout;

    TripsTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    public void broadcastEditingSessionAcquired(UUID itineraryId, LeaseHolder holder) {
        broadcast(itineraryId, EDITING_SESSION_ACQUIRED, new EditingSessionFrame(
                itineraryId, LeaseHolderResponse.of(holder)));
    }


    public void broadcastEditingSessionReleased(UUID itineraryId) {
        broadcast(itineraryId, EDITING_SESSION_RELEASED, new EditingSessionFrame(itineraryId, null));
    }


    public void broadcastPlanSaved(UUID itineraryId, long planVersion, int dayCount, Instant lastEditedAt) {
        broadcast(itineraryId, PLAN_SAVED, new PlanSavedFrame(itineraryId, planVersion, dayCount, lastEditedAt));
    }



    private void broadcast(UUID itineraryId, String type, Object payload) {
        AfterCommit.run(
                () ->
                        fanout.broadcast(
                                Topic.ofItinerary(itineraryId, TopicSubscriptions.TRIPS_CHANNEL),
                                type,
                                payload));
    }


    public record EditingSessionFrame(UUID itineraryId, LeaseHolderResponse editingSession) {}


    public record PlanSavedFrame(UUID itineraryId, long planVersion, int dayCount, Instant lastEditedAt) {}
}
