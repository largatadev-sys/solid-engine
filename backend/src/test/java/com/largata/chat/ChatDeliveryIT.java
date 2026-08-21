package com.largata.chat;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class ChatDeliveryIT extends PostgresTestBase {

    private static final Duration SILENCE = Duration.ofMillis(750);

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ObjectMapper json;

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
    void aSentMessageArrivesOnTheTripsChatTopicInTheEnvelopeShape() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("chatown" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String memberHandle = "chatmem" + tag;
        String member = tripRig.joinAsMember(owner, trip, memberHandle);

        try (WsTestClient listener = rig.connectAs(owner)) {
            subscribe(listener, trip);

            String sentId = sendAs(member, trip, "Ferry office says weather hold until 10am.");

            JsonNode envelope = json.readTree(listener.awaitFrame());
            assertThat(envelope.path("topic").asString()).isEqualTo(WsRig.chatTopic(trip));
            assertThat(envelope.path("type").asString()).isEqualTo(ChatTopic.EVENT_TYPE);

            JsonNode payload = envelope.path("payload");
            assertThat(payload.path("id").asString())
                    .as("the broadcast carries the same id the POST returned, which is what lets the"
                            + " sender reconcile its optimistic entry instead of double-rendering")
                    .isEqualTo(sentId);
            assertThat(payload.path("body").asString())
                    .isEqualTo("Ferry office says weather hold until 10am.");
            assertThat(payload.path("author").path("handle").asString()).isEqualTo(memberHandle);
            assertThat(payload.path("author").path("travelerId").asString()).isNotBlank();
            assertThat(payload.path("at").asString()).isNotBlank();
        }
    }


    @Test
    void theSenderReceivesItsOwnBroadcastSoTheClientMustDeduplicateById() throws Exception {
        String owner = tripRig.travelerWithHandle("chatown" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient sender = rig.connectAs(owner)) {
            subscribe(sender, trip);

            String sentId = sendAs(owner, trip, "Talking to myself.");

            assertThat(json.readTree(sender.awaitFrame()).path("payload").path("id").asString())
                    .as("the sender is a subscriber like any other; dedupe by id is the client contract")
                    .isEqualTo(sentId);
        }
    }


    @Test
    void aRefusedSendBroadcastsNothingBecauseTheBridgeWaitsForTheCommit() throws Exception {
        String owner = tripRig.travelerWithHandle("chatown" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);
        publish(owner, trip);

        try (WsTestClient listener = rig.connectAs(owner)) {
            subscribe(listener, trip);

            tripRig.send(HttpMethod.POST, messagesUri(trip), owner, body("Closed chat"))
                    .expectStatus()
                    .isEqualTo(409);

            assertThat(listener.receivedNothingWithin(SILENCE))
                    .as("decision 3 - a CHAT_CLOSED write fires no event. The failure mode is a frame"
                            + " arriving, so the wait is bounded rather than indefinite")
                    .isTrue();
        }
    }


    @Test
    void aMessageOnAnotherTripNeverReachesThisTripsSubscriber() throws Exception {
        String owner = tripRig.travelerWithHandle("chatiso" + WsRig.tag());
        String watched = tripRig.createTrip(owner, 2);
        String other = tripRig.createTrip(owner, 2);

        try (WsTestClient listener = rig.connectAs(owner)) {
            subscribe(listener, watched);

            sendAs(owner, other, "Different trip entirely.");

            assertThat(listener.receivedNothingWithin(SILENCE))
                    .as("INV-1 - chat never crosses the workspace wall, on the socket as on the wire")
                    .isTrue();
        }
    }


    @Test
    void aNonMemberIsRefusedTheChatTopicOutright() throws Exception {
        String owner = tripRig.travelerWithHandle("chatown" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);
        String stranger = tripRig.travelerWithHandle("chatstr" + WsRig.tag());

        try (WsTestClient outsider = rig.connectAs(stranger)) {
            outsider.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));

            assertThat(outsider.awaitFrame())
                    .as("the topic carries the same masked refusal the two REST doors do")
                    .doesNotContain("\"subscribed\"");
        }
    }


    private void subscribe(WsTestClient client, String trip) throws Exception {
        client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }


    private String sendAs(String token, String trip, String text) {
        byte[] created =
                tripRig
                        .send(HttpMethod.POST, messagesUri(trip), token, body(text))
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return TripRig.fieldIn(created, "id");
    }


    private void publish(String owner, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/start")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/complete")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private static String messagesUri(String trip) {
        return "/v1/itineraries/" + trip + "/chat/messages";
    }


    private static String body(String text) {
        return "{\"body\":\"" + text + "\"}";
    }
}
