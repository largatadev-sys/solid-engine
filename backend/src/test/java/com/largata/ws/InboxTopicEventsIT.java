package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.invitation.adapter.InboxTopic;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class InboxTopicEventsIT extends PostgresTestBase {

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
    void revokingTellsTheInviteeTheirInboxLostACard() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("ivro" + tag);
        String inviteeHandle = "ivri" + tag;
        String invitee = tripRig.travelerWithHandle(inviteeHandle);
        UUID inviteeId = tripRig.travelerIdOf(invitee);
        String trip = tripRig.createTrip(owner, 1);
        String invitationId = inviteByHandle(owner, trip, inviteeHandle);

        try (WsTestClient theirs = rig.connectAs(invitee)) {
            subscribeAsTraveler(theirs, inviteeId);

            revoke(owner, invitationId);

            JsonNode envelope =
                    json.readTree(theirs.awaitFrameContaining(InboxTopic.INVITATIONS_CHANGED));
            assertThat(envelope.path("topic").asString())
                    .as("the inbox belongs to one traveler, so the frame is addressed to them by id")
                    .isEqualTo("traveler:" + inviteeId);
            assertThat(envelope.path("payload").isNull())
                    .as("an audience of one needs no payload: the client asks REST for the inbox,"
                            + " which answers under rules the frame does not have to restate")
                    .isTrue();
        }
    }


    @Test
    void archivingTheTripVoidsThePendingInvitationAndSaysSo() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("ivao" + tag);
        String inviteeHandle = "ivai" + tag;
        String invitee = tripRig.travelerWithHandle(inviteeHandle);
        UUID inviteeId = tripRig.travelerIdOf(invitee);
        String trip = tripRig.createTrip(owner, 1);
        inviteByHandle(owner, trip, inviteeHandle);

        try (WsTestClient theirs = rig.connectAs(invitee)) {
            subscribeAsTraveler(theirs, inviteeId);

            archive(owner, trip);

            assertThat(payloadOf(theirs, InboxTopic.INVITATIONS_CHANGED))
                    .as("an archive takes the card away without anyone touching the invitation, so"
                            + " nothing else would tell the invitee it is gone")
                    .isTrue();
        }
    }


    @Test
    void decliningTellsTheDeclinersOtherDeviceTheCountFell() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("ivdo" + tag);
        String inviteeHandle = "ivdi" + tag;
        String invitee = tripRig.travelerWithHandle(inviteeHandle);
        UUID inviteeId = tripRig.travelerIdOf(invitee);
        String trip = tripRig.createTrip(owner, 1);
        String invitationId = inviteByHandle(owner, trip, inviteeHandle);

        try (WsTestClient theirs = rig.connectAs(invitee)) {
            subscribeAsTraveler(theirs, inviteeId);

            decline(invitee, invitationId);

            assertThat(payloadOf(theirs, InboxTopic.INVITATIONS_CHANGED))
                    .as("the phone declined it; the web preview must stop counting it without a"
                            + " refresh, which is the whole point of seen being a server fact")
                    .isTrue();
        }
    }


    @Test
    void markingSeenTellsTheTravelersOtherDeviceToStopCounting() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("ivso" + tag);
        String inviteeHandle = "ivsi" + tag;
        String invitee = tripRig.travelerWithHandle(inviteeHandle);
        UUID inviteeId = tripRig.travelerIdOf(invitee);
        String trip = tripRig.createTrip(owner, 1);
        inviteByHandle(owner, trip, inviteeHandle);

        try (WsTestClient theirs = rig.connectAs(invitee)) {
            subscribeAsTraveler(theirs, inviteeId);

            markSeen(invitee);

            assertThat(payloadOf(theirs, InboxTopic.INVITATIONS_CHANGED)).isTrue();
        }
    }


    @Test
    void anActThatChangedNothingAnnouncesNothing() throws Exception {
        String tag = WsRig.tag();
        String traveler = tripRig.travelerWithHandle("ivni" + tag);
        UUID travelerId = tripRig.travelerIdOf(traveler);

        try (WsTestClient theirs = rig.connectAs(traveler)) {
            subscribeAsTraveler(theirs, travelerId);

            markSeen(traveler);

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("nothing was pending, so no row moved and no frame is owed - a frame per"
                            + " call would refetch the inbox every time a traveler opens Requests")
                    .isTrue();
        }
    }


    @Test
    void aRefusedRevokeRollsBackAndAnnouncesNothing() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("ivfo" + tag);
        String inviteeHandle = "ivfi" + tag;
        String invitee = tripRig.travelerWithHandle(inviteeHandle);
        UUID inviteeId = tripRig.travelerIdOf(invitee);
        String stranger = tripRig.travelerWithHandle("ivfs" + tag);
        String trip = tripRig.createTrip(owner, 1);
        String invitationId = inviteByHandle(owner, trip, inviteeHandle);

        try (WsTestClient theirs = rig.connectAs(invitee)) {
            subscribeAsTraveler(theirs, inviteeId);

            rest.post()
                    .uri("/v1/invitations/" + invitationId + "/revoke")
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                    .exchange()
                    .expectStatus()
                    .isNotFound();

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("the fanout is AFTER COMMIT, so an act the guard refused reaches nobody -"
                            + " without that, a stranger's refused revoke would still move the"
                            + " invitee's screen")
                    .isTrue();
        }
    }


    private String inviteByHandle(String token, String tripId, String handle) {
        byte[] created =
                rest.post()
                        .uri("/v1/trips/" + tripId + "/invitations/by-handle")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"handle\":\"" + handle + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return TripRig.fieldIn(created, "id");
    }


    private void revoke(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void decline(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/decline")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void markSeen(String token) {
        rest.post()
                .uri("/v1/invitations/seen")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void archive(String token, String tripId) {
        rest.post()
                .uri("/v1/trips/" + tripId + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private boolean payloadOf(WsTestClient client, String type) throws Exception {
        return json.readTree(client.awaitFrameContaining(type)).path("payload").isNull();
    }


    private void subscribeAsTraveler(WsTestClient client, UUID travelerId) throws Exception {
        client.send(WsRig.subscribeTo("traveler:" + travelerId));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }
}
