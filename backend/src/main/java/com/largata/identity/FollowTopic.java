package com.largata.identity;

import com.largata.common.tx.AfterCommit;
import com.largata.ws.EventFanout;
import com.largata.ws.Topic;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class FollowTopic {

    public static final String FOLLOW_REQUESTS_CHANGED = "follow-requests.changed";

    public static final String FOLLOWERS_CHANGED = "followers.changed";

    private final EventFanout fanout;

    FollowTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    public void broadcastRequestsChanged(UUID targetId) {
        broadcast(targetId, FOLLOW_REQUESTS_CHANGED);
    }


    public void broadcastFollowersChanged(UUID followeeId) {
        broadcast(followeeId, FOLLOWERS_CHANGED);
    }


    private void broadcast(UUID travelerId, String type) {
        AfterCommit.run(() -> fanout.broadcast(Topic.ofTraveler(travelerId), type, null));
    }
}
