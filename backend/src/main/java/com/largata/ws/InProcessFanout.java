package com.largata.ws;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;


@Component
public class InProcessFanout implements EventFanout {

    private static final Logger log = LoggerFactory.getLogger(InProcessFanout.class);

    private final SessionRegistry registry;
    private final ObjectMapper json;
    private final Clock clock;

    InProcessFanout(SessionRegistry registry, ObjectMapper json, Clock clock) {
        this.registry = registry;
        this.json = json;
        this.clock = clock;
    }

    @Override
    public void broadcast(Topic topic, String type, Object payload) {
        var subscribers = registry.subscribersOf(topic);
        if (subscribers.isEmpty()) {
            return;
        }
        String frame = json.writeValueAsString(EventEnvelope.of(topic, type, clock.instant(), payload));
        int delivered = 0;
        for (Session session : subscribers) {
            if (session.send(frame)) {
                delivered++;
            }
        }
        log.debug("WS broadcast: topic={} type={} subscribers={} delivered={}",
                topic.name(), type, subscribers.size(), delivered);
    }
}
