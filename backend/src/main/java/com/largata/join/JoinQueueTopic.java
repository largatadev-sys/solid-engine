package com.largata.join;

import com.largata.common.tx.AfterCommit;
import com.largata.ws.EventFanout;
import com.largata.ws.Topic;
import com.largata.ws.TopicSubscriptions;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class JoinQueueTopic {

    public static final String JOIN_REQUESTS_CHANGED = "join-requests.changed";

    private final EventFanout fanout;

    JoinQueueTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    public void broadcastQueueChanged(UUID itineraryId) {
        AfterCommit.run(
                () ->
                        fanout.broadcast(
                                Topic.ofItinerary(itineraryId, TopicSubscriptions.TRIPS_CHANNEL),
                                JOIN_REQUESTS_CHANGED,
                                null));
    }
}
