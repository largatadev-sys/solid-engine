package com.largata.support;

import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.client.RestTestClient;

public final class WsRig {

    private static final String UPGRADE_PATH = "/ws";

    private final RestTestClient rest;
    private final int port;

    public WsRig(RestTestClient rest, int port) {
        this.rest = rest;
        this.port = port;
    }

    public String mintTicket(String token) {
        byte[] body =
                rest.post()
                        .uri("/v1/ws-ticket")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBody();
        return TripRig.fieldIn(body, "ticket");
    }

    public String urlFor(String ticket) {
        return "ws://localhost:" + port + UPGRADE_PATH + "?ticket=" + ticket;
    }

    public String bareUrl() {
        return "ws://localhost:" + port + UPGRADE_PATH;
    }

    public WsTestClient connectAs(String token) {
        return WsTestClient.connect(urlFor(mintTicket(token)), null);
    }

    public WsTestClient connectAs(String token, String origin) {
        return WsTestClient.connect(urlFor(mintTicket(token)), origin);
    }

    public static String chatTopic(String tripId) {
        return "itinerary:" + tripId + ":chat";
    }

    public static String subscribeTo(String topic) {
        return "{\"action\":\"subscribe\",\"topic\":\"" + topic + "\"}";
    }

    public static String unsubscribeFrom(String topic) {
        return "{\"action\":\"unsubscribe\",\"topic\":\"" + topic + "\"}";
    }

    public static String tag() {
        return UUID.randomUUID().toString().substring(0, 6).replace("-", "");
    }
}
