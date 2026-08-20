package com.largata.ws;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PongMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


public class LargataWebSocketHandler extends TextWebSocketHandler {

    static final CloseStatus MALFORMED_FRAME = new CloseStatus(4000, "MALFORMED_FRAME");

    private static final Logger log = LoggerFactory.getLogger(LargataWebSocketHandler.class);

    private final SessionRegistry registry;
    private final TopicSubscriptions subscriptions;
    private final ObjectProvider<DebugEchoTopic> debugEcho;
    private final ObjectMapper json;

    public LargataWebSocketHandler(
            SessionRegistry registry,
            TopicSubscriptions subscriptions,
            ObjectProvider<DebugEchoTopic> debugEcho,
            ObjectMapper json) {
        this.registry = registry;
        this.subscriptions = subscriptions;
        this.debugEcho = debugEcho;
        this.json = json;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession socket) {
        UUID travelerId = (UUID) socket.getAttributes().get(HandshakeGate.TRAVELER_ID);
        registry.register(Session.over(socket, travelerId));
        log.info("WS connected: travelerId={} sessions={}", travelerId, registry.sessionCount());
    }

    @Override
    protected void handleTextMessage(WebSocketSession socket, TextMessage message) {
        Session session = registry.find(socket.getId());
        if (session == null) {
            return;
        }
        JsonNode frame;
        try {
            frame = json.readTree(message.getPayload());
        } catch (RuntimeException malformed) {
            session.closeQuietly(MALFORMED_FRAME);
            return;
        }
        if (frame == null || !frame.isObject() || !frame.has("action")) {
            session.closeQuietly(MALFORMED_FRAME);
            return;
        }
        dispatch(session, frame.path("action").asString(""), frame);
    }

    @Override
    protected void handlePongMessage(WebSocketSession socket, PongMessage message) {
        Session session = registry.find(socket.getId());
        if (session != null) {
            session.pongReceived();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
        Session session = registry.find(socket.getId());
        if (session != null) {
            registry.unregister(session);
        }
        log.info(
                "WS closed: code={} reason={} sessions={} subscriptions={}",
                status.getCode(),
                status.getReason(),
                registry.sessionCount(),
                registry.subscriptionTotal());
    }

    private void dispatch(Session session, String action, JsonNode frame) {
        switch (action) {
            case "subscribe" -> answerSubscribe(session, frame.path("topic").asString(""));
            case "unsubscribe" -> answerUnsubscribe(session, frame.path("topic").asString(""));
            case "echo" -> echo(session, frame);
            default -> send(session, Map.of("action", "error", "code", FrameCodes.UNKNOWN_ACTION));
        }
    }

    private void answerSubscribe(Session session, String topic) {
        switch (subscriptions.subscribe(session, topic)) {
            case SUBSCRIBED -> send(session, Map.of("action", "subscribed", "topic", topic));
            case REFUSED ->
                    send(session, Map.of("action", "error", "code", FrameCodes.TOPIC_NOT_FOUND, "topic", topic));
            default ->
                    send(session, Map.of("action", "error", "code", FrameCodes.UNKNOWN_TOPIC, "topic", topic));
        }
    }

    private void answerUnsubscribe(Session session, String topic) {
        switch (subscriptions.unsubscribe(session, topic)) {
            case UNSUBSCRIBED -> send(session, Map.of("action", "unsubscribed", "topic", topic));
            case NOT_SUBSCRIBED ->
                    send(session, Map.of("action", "error", "code", FrameCodes.NOT_SUBSCRIBED, "topic", topic));
            default ->
                    send(session, Map.of("action", "error", "code", FrameCodes.UNKNOWN_TOPIC, "topic", topic));
        }
    }

    private void echo(Session session, JsonNode frame) {
        DebugEchoTopic topic = debugEcho.getIfAvailable();
        if (topic == null) {
            send(session, Map.of("action", "error", "code", FrameCodes.UNKNOWN_ACTION));
            return;
        }
        if (registry.subscribersOf(Topic.debugEcho()).contains(session)) {
            topic.echo(frame.path("payload"));
        }
    }

    private void sendError(Session session, String code, String topic) {
        send(session, Map.of("action", "error", "code", code, "topic", topic));
    }

    private void send(Session session, Map<String, Object> frame) {
        session.send(json.writeValueAsString(frame));
    }
}
