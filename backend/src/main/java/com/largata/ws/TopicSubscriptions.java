package com.largata.ws;

import com.largata.common.authz.AuthorizationGuard;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;


@Service
public class TopicSubscriptions {

    private final SessionRegistry registry;
    private final AuthorizationGuard guard;
    private final ObjectProvider<DebugEchoTopic> debugEcho;

    TopicSubscriptions(
            SessionRegistry registry, AuthorizationGuard guard, ObjectProvider<DebugEchoTopic> debugEcho) {
        this.registry = registry;
        this.guard = guard;
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
        return SubscriptionOutcome.SUBSCRIBED;
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
        return topic.itineraryId()
                .map(itineraryId -> guard.membershipOf(travelerId, itineraryId).isPresent())
                .orElse(false);
    }
}
