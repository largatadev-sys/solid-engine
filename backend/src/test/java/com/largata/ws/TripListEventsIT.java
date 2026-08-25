package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.itinerary.TripsTopic;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class TripListEventsIT extends PostgresTestBase {

    private static final Duration SILENCE = Duration.ofMillis(750);

    private static final String SESSION = "SESSION";

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
    void aCoMembersSaveCarriesTheNewPlanVersionToTheWatchingMember() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("plso" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String watcher = tripRig.joinAsMember(owner, trip, "plsw" + tag);
        UUID watcherId = tripRig.travelerIdOf(watcher);
        long before = tripRig.planVersionOf(owner, trip);

        try (WsTestClient theirs = rig.connectAs(watcher)) {
            subscribeAsTraveler(theirs, watcherId);

            tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));
            theirs.awaitFrameContaining(TripsTopic.EDITING_SESSION_ACQUIRED);
            savePlan(owner, trip, before);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(TripsTopic.PLAN_SAVED));
            assertThat(envelope.path("type").asString()).isEqualTo(TripsTopic.PLAN_SAVED);
            assertThat(envelope.path("payload").path("itineraryId").asString()).isEqualTo(trip);
            assertThat(envelope.path("payload").path("planVersion").asLong())
                    .as("The client writes this straight over the cached trip, so a stale version"
                            + " here would leave the card one save behind for good.")
                    .isGreaterThan(before);
            assertThat(envelope.path("payload").path("lastEditedAt").asString()).isNotBlank();
        }
    }

    @Test
    void anApprovedTravelerHearsAboutTheTripTheyJustJoined() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("mgro" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String joiner = tripRig.travelerWithHandle("mgrj" + tag);
        UUID joinerId = tripRig.travelerIdOf(joiner);

        try (WsTestClient theirs = rig.connectAs(joiner)) {
            subscribeAsTraveler(theirs, joinerId);

            admit(owner, trip, joiner);

            JsonNode envelope = json.readTree(theirs.awaitFrameContaining(TripEventTypes.MEMBERSHIP_GRANTED));
            assertThat(envelope.path("type").asString())
                    .as("The registration must land BEFORE the broadcast, or the one traveler this"
                            + " event is about is the one traveler who never receives it. Asserted"
                            + " from the APPROVED traveler's own session, not a bystander's.")
                    .isEqualTo(TripEventTypes.MEMBERSHIP_GRANTED);
            assertThat(envelope.path("topic").asString())
                    .as("Addressed to the approved traveler's own subject, which is what makes a"
                            + " contentless frame sufficient: the recipient IS the audience.")
                    .isEqualTo("traveler:" + joinerId);
        }
    }

    @Test
    void theGrantIsASignalThatNamesTheTripAndNothingAboutIt() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("mgso" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String joiner = tripRig.travelerWithHandle("mgsj" + tag);
        UUID joinerId = tripRig.travelerIdOf(joiner);

        try (WsTestClient theirs = rig.connectAs(joiner)) {
            subscribeAsTraveler(theirs, joinerId);
            admit(owner, trip, joiner);

            JsonNode payload =
                    json.readTree(theirs.awaitFrameContaining(TripEventTypes.MEMBERSHIP_GRANTED)).path("payload");
            assertThat(payload.isNull())
                    .as("A signal carries NOTHING: the client refetches, because it holds none of"
                            + " that trip's data and REST stays the sole authority on what this"
                            + " traveler may read. The spec's event table marks this one a signal,"
                            + " and a frame that quietly grew a payload would still deliver.")
                    .isTrue();
        }
    }

    @Test
    void aRolledBackSaveBroadcastsNothing() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("plro" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String watcher = tripRig.joinAsMember(owner, trip, "plrw" + tag);
        UUID watcherId = tripRig.travelerIdOf(watcher);

        try (WsTestClient theirs = rig.connectAs(watcher)) {
            subscribeAsTraveler(theirs, watcherId);
            tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));
            theirs.awaitFrameContaining(TripsTopic.EDITING_SESSION_ACQUIRED);

            tripRig
                    .send(HttpMethod.PUT, planUri(trip), owner, stalePlanBody())
                    .expectStatus()
                    .isEqualTo(409);

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("A refused save changes nothing and must announce nothing. The session is"
                            + " established first, so silence means the failed path stayed quiet.")
                    .isTrue();
        }
    }

    private void savePlan(String token, String trip, long basePlanVersion) {
        tripRig
                .send(
                        HttpMethod.PUT,
                        planUri(trip),
                        token,
                        "{\"basePlanVersion\":" + basePlanVersion + ",\"days\":[]}")
                .expectStatus()
                .isOk();
    }

    private static String stalePlanBody() {
        return "{\"basePlanVersion\":9999,\"days\":[]}";
    }

    private static String planUri(String trip) {
        return "/v1/itineraries/" + trip + "/plan";
    }

    private void admit(String ownerToken, String trip, String joinerToken) {
        byte[] invitation =
                rest.post()
                        .uri("/v1/itineraries/" + trip + "/invitations/by-handle")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
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

    private void subscribeAsTraveler(WsTestClient client, UUID travelerId) throws Exception {
        client.send(WsRig.subscribeTo("traveler:" + travelerId));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }
}
