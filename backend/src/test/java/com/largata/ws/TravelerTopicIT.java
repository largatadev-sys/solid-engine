package com.largata.ws;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class TravelerTopicIT extends PostgresTestBase {

    private static final Duration SILENCE = Duration.ofMillis(750);

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private SessionRegistry registry;

    @Autowired private EventFanout fanout;

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
    void aTravelerSubscribingToTheirOwnTopicIsAcknowledged() throws Exception {
        String traveler = tripRig.travelerWithHandle("tvown" + WsRig.tag());
        UUID travelerId = tripRig.travelerIdOf(traveler);

        try (WsTestClient client = rig.connectAs(traveler)) {
            client.send(WsRig.subscribeTo(travelerTopic(travelerId)));

            assertThat(client.awaitFrame()).contains("\"subscribed\"").contains(travelerTopic(travelerId));
        }
    }

    @Test
    void subscribingToSomebodyElsesTopicIsIndistinguishableFromSubscribingToNonsense()
            throws Exception {
        String tag = WsRig.tag();
        String traveler = tripRig.travelerWithHandle("tvmsk" + tag);
        UUID somebodyElse = tripRig.travelerIdOf(tripRig.travelerWithHandle("tvoth" + tag));

        try (WsTestClient client = rig.connectAs(traveler)) {
            client.send(WsRig.subscribeTo(travelerTopic(somebodyElse)));
            String foreign = client.awaitFrame();

            client.send(WsRig.subscribeTo(travelerTopic(UUID.randomUUID())));
            String nobody = client.awaitFrame();

            assertThat(withoutTheEchoedTopic(foreign))
                    .as("A well-formed id belonging to somebody else and one belonging to nobody must"
                            + " answer identically, or the refusal itself reports whether a traveler"
                            + " exists. Only the echoed topic may differ — the client sent that, so it"
                            + " discloses nothing; everything else must match byte for byte.")
                    .isEqualTo(withoutTheEchoedTopic(nobody));
            assertThat(foreign).contains(FrameCodes.TOPIC_NOT_FOUND);
            assertThat(foreign).doesNotContain("FORBIDDEN").doesNotContain("DENIED");
        }
    }

    @Test
    void aGarbageTravelerIdIsRefusedByTheParserBeforeTheGuardIsConsulted() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("tvgrb" + WsRig.tag()))) {
            client.send(WsRig.subscribeTo("traveler:not-a-uuid"));

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_TOPIC);
        }
    }

    @Test
    void subscribingRegistersTheSessionUnderEveryTripTheTravelerBelongsTo() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("tvfan" + tag);
        UUID ownerId = tripRig.travelerIdOf(owner);
        String first = tripRig.createTrip(owner, 2);
        String second = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            client.send(WsRig.subscribeTo(travelerTopic(ownerId)));
            assertThat(client.awaitFrame()).contains("\"subscribed\"");

            fanout.broadcast(Topic.ofItinerary(UUID.fromString(first), "trips"), "test.probe", "one");
            assertThat(client.awaitFrame()).contains("one");

            fanout.broadcast(Topic.ofItinerary(UUID.fromString(second), "trips"), "test.probe", "two");
            assertThat(client.awaitFrame())
                    .as("One subscription, every trip. The fan-in resolves memberships once at"
                            + " subscribe time; a second trip arriving proves the registration"
                            + " covered more than the first.")
                    .contains("two");
        }
    }

    @Test
    void aTripTheTravelerDoesNotBelongToNeverReachesTheirTopic() throws Exception {
        String tag = WsRig.tag();
        String stranger = tripRig.travelerWithHandle("tvstr" + tag);
        UUID strangerId = tripRig.travelerIdOf(stranger);
        String somebodyElsesTrip =
                tripRig.createTrip(tripRig.travelerWithHandle("tvsto" + tag), 2);

        try (WsTestClient client = rig.connectAs(stranger)) {
            client.send(WsRig.subscribeTo(travelerTopic(strangerId)));
            assertThat(client.awaitFrame()).contains("\"subscribed\"");

            fanout.broadcast(
                    Topic.ofItinerary(UUID.fromString(somebodyElsesTrip), "trips"), "test.probe", "private");

            assertThat(client.receivedNothingWithin(SILENCE))
                    .as("The fan-in registers a session only under trips the traveler belongs to. A"
                            + " broadcast is fired first, so silence means the registration was"
                            + " correctly absent rather than that nothing was sent.")
                    .isTrue();
        }
    }

    @Test
    void aRemovedMemberStopsReceivingThatTripsEventsOnTheirTravelerTopic() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("tvevo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String member = tripRig.joinAsMember(owner, trip, "tvevm" + tag);
        UUID memberId = tripRig.travelerIdOf(member);

        try (WsTestClient theirs = rig.connectAs(member)) {
            theirs.send(WsRig.subscribeTo(travelerTopic(memberId)));
            assertThat(theirs.awaitFrame()).contains("\"subscribed\"");

            remove(owner, trip, member);
            fanout.broadcast(Topic.ofItinerary(UUID.fromString(trip), "trips"), "test.probe", "after-removal");

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("The eviction family extends to the new subject: a departure must remove the"
                            + " registration the traveler-topic fan-in added, not only the ones an"
                            + " explicit per-trip subscribe created.")
                    .isTrue();
        }
    }

    @Test
    void aTripCreatedAfterSubscribingStillReachesItsOwner() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("tvnew" + tag);
        UUID ownerId = tripRig.travelerIdOf(owner);

        try (WsTestClient theirs = rig.connectAs(owner)) {
            theirs.send(WsRig.subscribeTo(travelerTopic(ownerId)));
            assertThat(theirs.awaitFrame()).contains("\"subscribed\"");

            String freshTrip = tripRig.createTrip(owner, 2);
            fanout.broadcast(
                    Topic.ofItinerary(UUID.fromString(freshTrip), "trips"), "test.probe", "on-my-own-new-trip");

            assertThat(theirs.awaitFrameContaining("on-my-own-new-trip"))
                    .as("The fan-in resolves memberships once AT SUBSCRIBE, so a trip created"
                            + " afterwards has no registration unless creation announces itself. Its"
                            + " owner would then miss join requests and roster changes on their own"
                            + " new trip until they reconnected — and every e2e walk seeds its trips"
                            + " before connecting, so no walk can see this.")
                    .contains("on-my-own-new-trip");
        }
    }

    @Test
    void aNewlyAdmittedMemberReceivesTheTripsEventsWithoutResubscribing() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("tvado" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String joiner = tripRig.travelerWithHandle("tvadj" + tag);
        UUID joinerId = tripRig.travelerIdOf(joiner);

        try (WsTestClient theirs = rig.connectAs(joiner)) {
            theirs.send(WsRig.subscribeTo(travelerTopic(joinerId)));
            assertThat(theirs.awaitFrame()).contains("\"subscribed\"");

            admit(owner, trip, joiner);

            fanout.broadcast(Topic.ofItinerary(UUID.fromString(trip), "trips"), "test.probe", "after-admission");

            assertThat(theirs.awaitFrameContaining("after-admission"))
                    .as("Admission mirrors eviction. Without it the session subscribed before joining"
                            + " is registered under nothing, so the one traveler an admission concerns"
                            + " is the one traveler who never hears about it.")
                    .contains("after-admission");
        }
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

    private static String travelerTopic(UUID travelerId) {
        return "traveler:" + travelerId;
    }

    private static String withoutTheEchoedTopic(String frame) {
        return frame.replaceAll("\"topic\":\"[^\"]*\"", "\"topic\":\"<echoed>\"");
    }
}
