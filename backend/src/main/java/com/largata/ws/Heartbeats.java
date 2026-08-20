package com.largata.ws;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;


@Component
public class Heartbeats {

    private final SessionRegistry registry;
    private final ConnectionTickets tickets;

    Heartbeats(SessionRegistry registry, ConnectionTickets tickets) {
        this.registry = registry;
        this.tickets = tickets;
    }

    @Scheduled(fixedRateString = "#{T(com.largata.ws.WebSocketConfig).HEARTBEAT.toMillis()}")
    void pingEverySession() {
        registry.sessions().forEach(Session::pingAndCheckLiveness);
    }

    @Scheduled(fixedRateString = "#{T(com.largata.ws.ConnectionTickets).TTL.toMillis()}")
    void sweepExpiredTickets() {
        tickets.sweep();
    }
}
