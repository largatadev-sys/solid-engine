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
class TopicSubscriptionIT extends PostgresTestBase {

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
    void aMemberSubscribingToTheirOwnTripIsAcknowledged() throws Exception {
        String owner = tripRig.travelerWithHandle("wssub" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));

            assertThat(client.awaitFrame()).contains("\"subscribed\"").contains(WsRig.chatTopic(trip));
        }
    }

    @Test
    void aNonMemberSubscribingGetsTheMaskedRefusalRatherThanADenial() throws Exception {
        String owner = tripRig.travelerWithHandle("wsown" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);
        String stranger = tripRig.travelerWithHandle("wsstr" + WsRig.tag());

        try (WsTestClient client = rig.connectAs(stranger)) {
            client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));

            String frame = client.awaitFrame();
            assertThat(frame).contains(FrameCodes.TOPIC_NOT_FOUND);
            assertThat(frame).doesNotContain("FORBIDDEN").doesNotContain("DENIED");
        }
    }

    @Test
    void anUnparseableTopicIsRefusedWithoutTouchingTheGuard() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("wsbad" + WsRig.tag()))) {
            client.send(WsRig.subscribeTo("itinerary:not-a-uuid:chat"));

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_TOPIC);
        }
    }

    @Test
    void unsubscribingReleasesTheSubscriptionAndIsAcknowledged() throws Exception {
        String owner = tripRig.travelerWithHandle("wsuns" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
            client.awaitFrame();

            client.send("{\"action\":\"unsubscribe\",\"topic\":\"" + WsRig.chatTopic(trip) + "\"}");

            assertThat(client.awaitFrame()).contains("\"unsubscribed\"");
        }
    }

    @Test
    void unsubscribingFromSomethingNeverHeldSaysSoRatherThanPretendingItWorked() throws Exception {
        String owner = tripRig.travelerWithHandle("wsnos" + WsRig.tag());
        String trip = tripRig.createTrip(owner, 2);

        try (WsTestClient client = rig.connectAs(owner)) {
            client.send("{\"action\":\"unsubscribe\",\"topic\":\"" + WsRig.chatTopic(trip) + "\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.NOT_SUBSCRIBED);
        }
    }

    @Test
    void aRemovedMemberGoesSilentRatherThanKeepingItsSeat() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("wsevo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String member = tripRig.joinAsMember(owner, trip, "wsevm" + tag);

        try (WsTestClient theirs = rig.connectAs(member)) {
            theirs.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
            assertThat(theirs.awaitFrame()).contains("\"subscribed\"");

            remove(owner, trip, member);
            fanout.broadcast(Topic.ofItinerary(UUID.fromString(trip), "chat"), "test.probe", "after-removal");

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("A removed member must receive nothing further on the trip's topics. A"
                            + " broadcast is fired first so silence means eviction rather than an"
                            + " absence of traffic, and the wait is bounded so the failure is a"
                            + " frame arriving rather than a hang.")
                    .isTrue();
            assertThat(subscriberCountOn(trip)).isZero();
        }
    }

    @Test
    void aRemovedMemberCannotSimplySubscribeAgain() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("wsreo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String member = tripRig.joinAsMember(owner, trip, "wsrem" + tag);

        try (WsTestClient theirs = rig.connectAs(member)) {
            theirs.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
            theirs.awaitFrame();
            remove(owner, trip, member);

            theirs.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));

            assertThat(theirs.awaitFrame()).contains(FrameCodes.TOPIC_NOT_FOUND);
        }
    }

    @Test
    void aSurvivingMembersSubscriptionOutlivesAnotherTravelersRemoval() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("wssuo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String leaving = tripRig.joinAsMember(owner, trip, "wssul" + tag);

        try (WsTestClient theirs = rig.connectAs(owner)) {
            theirs.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
            theirs.awaitFrame();

            remove(owner, trip, leaving);

            assertThat(subscriberCountOn(trip)).isEqualTo(1);
        }
    }

    private void remove(String ownerToken, String trip, String memberToken) {
        rest.delete()
                .uri("/v1/itineraries/" + trip + "/members/" + tripRig.travelerIdOf(memberToken))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    private int subscriberCountOn(String trip) {
        return registry.subscriptionCount(Topic.ofItinerary(UUID.fromString(trip), "chat"));
    }




}
