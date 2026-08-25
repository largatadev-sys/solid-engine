package com.largata.invitation;

import com.largata.common.tx.AfterCommit;
import com.largata.invitation.web.InboxInvitationResponse;
import com.largata.ws.EventFanout;
import com.largata.ws.Topic;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class InboxTopic {

    public static final String INVITATION_RECEIVED = "invitation.received";

    private final EventFanout fanout;

    InboxTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    public void broadcastInvitationReceived(UUID inviteeTravelerId, InboxInvitation invitation) {
        InboxInvitationResponse payload = InboxInvitationResponse.of(invitation);
        AfterCommit.run(
                () ->
                        fanout.broadcast(
                                Topic.ofTraveler(inviteeTravelerId), INVITATION_RECEIVED, payload));
    }
}
