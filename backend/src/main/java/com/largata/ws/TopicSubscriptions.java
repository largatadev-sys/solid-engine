package com.largata.ws;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.workspace.WorkspaceService;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;


@Service
public class TopicSubscriptions {

    public static final String TRIPS_CHANNEL = "trips";

    private final SessionRegistry registry;
    private final AuthorizationGuard guard;
    private final WorkspaceService workspaces;
    private final ObjectProvider<DebugEchoTopic> debugEcho;

    TopicSubscriptions(
            SessionRegistry registry,
            AuthorizationGuard guard,
            WorkspaceService workspaces,
            ObjectProvider<DebugEchoTopic> debugEcho) {
        this.registry = registry;
        this.guard = guard;
        this.workspaces = workspaces;
        this.debugEcho = debugEcho;
    }


    public SubscriptionOutcome subscribe(Session session, String topicName) {
        Optional<Topic> parsed = Topic.parse(topicName);
        if (parsed.isEmpty()) {
            return SubscriptionOutcome.UNKNOWN_TOPIC;
        }
        Topic topic = parsed.get();
        if (!isPermitted(session.travelerId(), topic)) {
            return SubscriptionOutcome.REFUSED;
        }
        registry.subscribe(session, topic);
        topic.travelerId().ifPresent(travelerId -> registerUnderEveryTrip(session, travelerId));
        return SubscriptionOutcome.SUBSCRIBED;
    }


    public void registerUnderEveryTrip(Session session, UUID travelerId) {
        workspaces.itineraryIdsInSightOf(travelerId).forEach(itineraryId -> registerTrip(session, itineraryId));
    }


    public void registerTrip(Session session, UUID itineraryId) {
        registry.subscribe(session, Topic.ofItinerary(itineraryId, TRIPS_CHANNEL));
    }


    public SubscriptionOutcome unsubscribe(Session session, String topicName) {
        Optional<Topic> parsed = Topic.parse(topicName);
        if (parsed.isEmpty()) {
            return SubscriptionOutcome.UNKNOWN_TOPIC;
        }
        return registry.unsubscribe(session, parsed.get())
                ? SubscriptionOutcome.UNSUBSCRIBED
                : SubscriptionOutcome.NOT_SUBSCRIBED;
    }

    private boolean isPermitted(UUID travelerId, Topic topic) {
        if (topic.isDebugEcho()) {
            return debugEcho.getIfAvailable() != null;
        }
        if (topic.travelerId().isPresent()) {
            return topic.travelerId().get().equals(travelerId);
        }
        return topic.itineraryId()
                .map(itineraryId -> guard.membershipOf(travelerId, itineraryId).isPresent())
                .orElse(false);
    }
}
