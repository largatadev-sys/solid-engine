package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestJwtSupport.Config.class, EventFanoutIT.ProbeConfig.class})
@ActiveProfiles("dev")
class EventFanoutIT extends PostgresTestBase {

    private static final Duration SILENCE = Duration.ofMillis(750);

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ObjectMapper json;

    @Autowired private ProbePublisher publisher;

    private RestTestClient rest;
    private TripRig tripRig;
    private WsRig rig;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        tripRig = new TripRig(rest, jdbc);
        rig = new WsRig(rest, port);
    }

    @Test
    void aCommittedPublishArrivesInTheEnvelopeShape() throws Exception {
        String owner = tripRig.travelerWithHandle("wsfan" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            subscribe(client, trip);

            publisher.publishAndCommit(UUID.fromString(trip), "hello");

            JsonNode envelope = json.readTree(client.awaitFrame());
            assertThat(envelope.path("topic").asString()).isEqualTo(WsRig.chatTopic(trip));
            assertThat(envelope.path("type").asString()).isEqualTo(ProbeListener.EVENT_TYPE);
            assertThat(envelope.path("payload").asString()).isEqualTo("hello");
            assertThat(envelope.path("eventId").asString()).isNotBlank();
            assertThat(Instant.parse(envelope.path("at").asString()))
                    .as("ADR-030 says `at` is a UTC instant. Jackson renders an Instant as a decimal"
                            + " epoch by default, which parses as a number and would strand every"
                            + " client that reads it as a timestamp string.")
                    .isBetween(Instant.parse("2020-01-01T00:00:00Z"), Instant.parse("2100-01-01T00:00:00Z"));
        }
    }

    @Test
    void theEventIdIsAUuidV7SoConsumersCanOrderByItLater() throws Exception {
        String owner = tripRig.travelerWithHandle("wsuid" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            subscribe(client, trip);

            publisher.publishAndCommit(UUID.fromString(trip), "versioned");

            JsonNode envelope = json.readTree(client.awaitFrame());
            assertThat(UUID.fromString(envelope.path("eventId").asString()).version()).isEqualTo(7);
        }
    }

    @Test
    void aRolledBackPublishReachesNobodyBecauseTheBridgeWaitsForTheCommit() throws Exception {
        String owner = tripRig.travelerWithHandle("wsrbk" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            subscribe(client, trip);

            assertThatThrownBy(() -> publisher.publishAndRollBack(UUID.fromString(trip), "never-sent"))
                    .isInstanceOf(DeliberateRollback.class);

            assertThat(client.receivedNothingWithin(SILENCE))
                    .as("A broadcast can never precede its commit, so a rolled-back write must"
                            + " broadcast nothing. The failure mode is a frame arriving; the wait is"
                            + " bounded rather than indefinite.")
                    .isTrue();
        }
    }

    @Test
    void everySubscriberOnATopicReceivesTheSameEvent() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("wsmuo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String member = tripRig.joinAsMember(owner, trip, "wsmum" + tag);

        try (WsTestClient theirs = rig.connectAs(owner);
                WsTestClient others = rig.connectAs(member)) {
            subscribe(theirs, trip);
            subscribe(others, trip);

            publisher.publishAndCommit(UUID.fromString(trip), "to-everyone");

            assertThat(json.readTree(theirs.awaitFrame()).path("payload").asString()).isEqualTo("to-everyone");
            assertThat(json.readTree(others.awaitFrame()).path("payload").asString()).isEqualTo("to-everyone");
        }
    }

    @Test
    void anEventOnATopicNobodyHoldsReachesTheOtherTripsSubscriberNotAtAll() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("wsiso" + tag);
        String watched = tripRig.createTrip(owner, 2);
        String other = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            subscribe(client, watched);

            publisher.publishAndCommit(UUID.fromString(other), "wrong-trip");

            assertThat(client.receivedNothingWithin(SILENCE)).isTrue();
        }
    }

    @Test
    void theDevEchoTopicRoundTripsASubscribersOwnFrame() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("wsech" + WsRig.tag()))) {
            client.send(WsRig.subscribeTo(Topic.DEBUG_ECHO));
            assertThat(client.awaitFrame()).contains("\"subscribed\"");

            client.send("{\"action\":\"echo\",\"payload\":\"ping\"}");

            JsonNode envelope = json.readTree(client.awaitFrame());
            assertThat(envelope.path("topic").asString()).isEqualTo(Topic.DEBUG_ECHO);
            assertThat(envelope.path("type").asString()).isEqualTo(DebugEchoTopic.EVENT_TYPE);
            assertThat(envelope.path("payload").asString()).isEqualTo("ping");
        }
    }

    @Test
    void anEchoReachesEveryOtherSubscriberOfTheDebugTopic() throws Exception {
        try (WsTestClient sender = rig.connectAs(tripRig.travelerWithHandle("wses1" + WsRig.tag()));
                WsTestClient listener = rig.connectAs(tripRig.travelerWithHandle("wses2" + WsRig.tag()))) {
            sender.send(WsRig.subscribeTo(Topic.DEBUG_ECHO));
            sender.awaitFrame();
            listener.send(WsRig.subscribeTo(Topic.DEBUG_ECHO));
            listener.awaitFrame();

            sender.send("{\"action\":\"echo\",\"payload\":\"across\"}");

            assertThat(json.readTree(listener.awaitFrame()).path("payload").asString()).isEqualTo("across");
        }
    }

    @Test
    void anUnknownActionAnswersAnErrorFrameAndLeavesTheConnectionOpen() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("wsunk" + WsRig.tag()))) {
            client.send("{\"action\":\"teleport\"}");
            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);

            client.send(WsRig.subscribeTo(Topic.DEBUG_ECHO));

            assertThat(client.awaitFrame()).contains("\"subscribed\"");
        }
    }

    @Test
    void aMalformedFrameClosesTheConnectionRatherThanBeingIgnored() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("wsmal" + WsRig.tag()))) {
            client.send("not json at all");

            assertThat(client.awaitClose()).isEqualTo(LargataWebSocketHandler.MALFORMED_FRAME.getCode());
        }
    }

    private void subscribe(WsTestClient client, String trip) throws Exception {
        client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }





    record ProbeRaised(UUID itineraryId, String payload) {}

    @Component
    static class ProbePublisher {

        private final ApplicationEventPublisher events;

        ProbePublisher(ApplicationEventPublisher events) {
            this.events = events;
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        void publishAndCommit(UUID itineraryId, String payload) {
            events.publishEvent(new ProbeRaised(itineraryId, payload));
        }

        @Transactional(propagation = Propagation.REQUIRES_NEW)
        void publishAndRollBack(UUID itineraryId, String payload) {
            events.publishEvent(new ProbeRaised(itineraryId, payload));
            throw new DeliberateRollback();
        }
    }

    @Component
    static class ProbeListener {

        static final String EVENT_TYPE = "test.probe.raised";

        private final EventFanout fanout;

        ProbeListener(EventFanout fanout) {
            this.fanout = fanout;
        }

        @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
        void broadcast(ProbeRaised raised) {
            fanout.broadcast(Topic.ofItinerary(raised.itineraryId(), "chat"), EVENT_TYPE, raised.payload());
        }
    }

    static final class DeliberateRollback extends RuntimeException {}

    @TestConfiguration
    static class ProbeConfig {

        @Bean
        ProbePublisher probePublisher(ApplicationEventPublisher events) {
            return new ProbePublisher(events);
        }

        @Bean
        ProbeListener probeListener(EventFanout fanout) {
            return new ProbeListener(fanout);
        }
    }
}
