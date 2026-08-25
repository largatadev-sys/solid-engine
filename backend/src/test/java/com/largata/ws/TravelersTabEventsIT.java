package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.join.JoinQueueTopic;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class TravelersTabEventsIT extends PostgresTestBase {

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
    void aJoinRequestAnnouncesItselfCarryingNothingAtAll() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("jqco" + tag);
        String trip = tripRig.createTrip(owner, 2);
        UUID ownerId = tripRig.travelerIdOf(owner);
        String requester = tripRig.travelerWithHandle("jqcr" + tag);

        try (WsTestClient theirs = rig.connectAs(owner)) {
            subscribeAsTraveler(theirs, ownerId);

            requestToJoin(owner, trip, requester);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(JoinQueueTopic.JOIN_REQUESTS_CHANGED));
            assertThat(envelope.path("payload").isNull())
                    .as("The approval queue is owner-only, and this frame goes to the whole trip."
                            + " A payload here would tell every ordinary member what REST withholds"
                            + " from them. A test that only checked delivery would pass while the"
                            + " audience rule was broken, which is why the emptiness is the assertion.")
                    .isTrue();
        }
    }

    @Test
    void anOrdinaryMemberReceivesTheQueueSignalAndLearnsNothingFromIt() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("jqmo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String member = tripRig.joinAsMember(owner, trip, "jqmm" + tag);
        UUID memberId = tripRig.travelerIdOf(member);
        String requester = tripRig.travelerWithHandle("jqmr" + tag);

        try (WsTestClient theirs = rig.connectAs(member)) {
            subscribeAsTraveler(theirs, memberId);

            requestToJoin(owner, trip, requester);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(JoinQueueTopic.JOIN_REQUESTS_CHANGED));
            assertThat(envelope.path("payload").isNull())
                    .as("The non-owner genuinely receives the frame — filtering per subscriber was"
                            + " rejected at the grilling because it costs a serialization per"
                            + " session. What protects them is that it says nothing.")
                    .isTrue();
        }
    }

    @Test
    void theRosterAnnouncesADepartureCarryingNothingAtAll() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("rsdo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        UUID ownerId = tripRig.travelerIdOf(owner);
        String leaving = tripRig.joinAsMember(owner, trip, "rsdl" + tag);

        try (WsTestClient theirs = rig.connectAs(owner)) {
            subscribeAsTraveler(theirs, ownerId);

            remove(owner, trip, leaving);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(TripEventTypes.ROSTER_CHANGED));
            assertThat(envelope.path("payload").isNull())
                    .as("The roster is a REST read with its own visibility rules. This frame says"
                            + " only that it moved; who moved is the server's to answer on request.")
                    .isTrue();
        }
    }

    @Test
    void theRosterAnnouncesAnArrivalToTheTripTheTravelerJoined() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("rsao" + tag);
        String trip = tripRig.createTrip(owner, 2);
        UUID ownerId = tripRig.travelerIdOf(owner);
        String joiner = tripRig.travelerWithHandle("rsaj" + tag);

        try (WsTestClient theirs = rig.connectAs(owner)) {
            subscribeAsTraveler(theirs, ownerId);

            admit(owner, trip, joiner);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(TripEventTypes.ROSTER_CHANGED));
            assertThat(envelope.path("topic").asString())
                    .as("Arrivals and departures are one event on the trip's own topic, so a member"
                            + " watching the Travelers tab refetches either way.")
                    .isEqualTo("itinerary:" + trip + ":" + TopicSubscriptions.TRIPS_CHANNEL);
            assertThat(envelope.path("payload").isNull()).isTrue();
        }
    }

    private void requestToJoin(String ownerToken, String trip, String requesterToken) {
        byte[] link =
                rest.get()
                        .uri("/v1/itineraries/" + trip + "/join-link")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        rest.post()
                .uri("/v1/join/" + TripRig.fieldIn(link, "token") + "/request")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(requesterToken))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }

    private void admit(String ownerToken, String trip, String joinerToken) {
        byte[] invitation =
                rest.post()
                        .uri("/v1/itineraries/" + trip + "/invitations/by-handle")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .body("{\"handle\":\"" + handleOf(joinerToken) + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        rest.post()
                .uri("/v1/invitations/" + TripRig.fieldIn(invitation, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(joinerToken))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String handleOf(String token) {
        return TripRig.fieldIn(
                rest.get()
                        .uri("/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "handle");
    }

    private void remove(String ownerToken, String trip, String memberToken) {
        rest.delete()
                .uri("/v1/itineraries/" + trip + "/members/" + tripRig.travelerIdOf(memberToken))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private void subscribeAsTraveler(WsTestClient client, UUID travelerId) throws Exception {
        client.send(WsRig.subscribeTo("traveler:" + travelerId));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }
}
