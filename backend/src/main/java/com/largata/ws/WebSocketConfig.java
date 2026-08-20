package com.largata.ws;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import tools.jackson.databind.ObjectMapper;


@Configuration
@EnableWebSocket
@EnableScheduling
public class WebSocketConfig implements WebSocketConfigurer {

    public static final Duration HEARTBEAT = Duration.ofSeconds(30);

    private final LargataWebSocketHandler handler;
    private final HandshakeGate gate;

    WebSocketConfig(LargataWebSocketHandler handler, HandshakeGate gate) {
        this.handler = handler;
        this.gate = gate;
    }

    @Bean
    static LargataWebSocketHandler largataWebSocketHandler(
            SessionRegistry registry,
            TopicSubscriptions subscriptions,
            org.springframework.beans.factory.ObjectProvider<DebugEchoTopic> debugEcho,
            ObjectMapper json) {
        return new LargataWebSocketHandler(registry, subscriptions, debugEcho, json);
    }

    @Bean
    static HandshakeGate handshakeGate(ConnectionTickets tickets, OriginPolicy origins) {
        return new HandshakeGate(tickets, origins);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, WebSocketPaths.UPGRADE)
                .addInterceptors(gate)
                .setAllowedOriginPatterns("*");
    }
}
