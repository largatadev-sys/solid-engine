package com.largata.ws;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;


public class HandshakeGate implements HandshakeInterceptor {

    public static final String TRAVELER_ID = "travelerId";

    static final String TICKET_PARAM = "ticket";

    private static final Logger log = LoggerFactory.getLogger(HandshakeGate.class);

    private final ConnectionTickets tickets;
    private final OriginPolicy origins;

    public HandshakeGate(ConnectionTickets tickets, OriginPolicy origins) {
        this.tickets = tickets;
        this.origins = origins;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler handler,
            Map<String, Object> attributes) {
        if (!origins.admits(request.getHeaders().getOrigin())) {
            return refuse(response, "origin");
        }
        UUID travelerId = tickets.redeem(ticketOf(request)).orElse(null);
        if (travelerId == null) {
            return refuse(response, "ticket");
        }
        attributes.put(TRAVELER_ID, travelerId);
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler handler,
            Exception exception) {}

    private String ticketOf(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servlet) {
            return servlet.getServletRequest().getParameter(TICKET_PARAM);
        }
        return UriComponentsBuilder.fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst(TICKET_PARAM);
    }

    private boolean refuse(ServerHttpResponse response, String reason) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        log.info("WS handshake refused: reason={}", reason);
        return false;
    }
}
