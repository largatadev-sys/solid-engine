package com.largata.ws;

import com.largata.common.id.UuidV7;
import java.time.Instant;
import java.util.UUID;


public record EventEnvelope(String topic, String type, UUID eventId, Instant at, Object payload) {

    public static EventEnvelope of(Topic topic, String type, Instant at, Object payload) {
        return new EventEnvelope(topic.name(), type, UuidV7.generate(), at, payload);
    }
}
