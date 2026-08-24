package com.largata.ws;

import com.largata.invitation.MembershipArrived;
import com.largata.workspace.WorkspaceService;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;


@Component
public class MembershipAdmissionListener {

    private static final Logger log = LoggerFactory.getLogger(MembershipAdmissionListener.class);

    private final SessionRegistry registry;
    private final TopicSubscriptions subscriptions;
    private final WorkspaceService workspaces;

    MembershipAdmissionListener(
            SessionRegistry registry, TopicSubscriptions subscriptions, WorkspaceService workspaces) {
        this.registry = registry;
        this.subscriptions = subscriptions;
        this.workspaces = workspaces;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void admitArrivedMember(MembershipArrived arrival) {
        UUID itineraryId =
                workspaces.itineraryIdsByWorkspace(List.of(arrival.workspaceId())).get(arrival.workspaceId());
        if (itineraryId == null) {
            return;
        }
        var sessions =
                registry.sessions().stream()
                        .filter(session -> session.travelerId().equals(arrival.travelerId()))
                        .filter(session -> registry.holds(session, Topic.ofTraveler(arrival.travelerId())))
                        .toList();
        sessions.forEach(session -> subscriptions.registerTrip(session, itineraryId));
        if (!sessions.isEmpty()) {
            log.info(
                    "WS subscriptions admitted: itineraryId={} travelerId={} sessions={}",
                    itineraryId,
                    arrival.travelerId(),
                    sessions.size());
        }
    }
}
