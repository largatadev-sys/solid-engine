package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.identity.FollowTopic;
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
class FollowTopicEventsIT extends PostgresTestBase {

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
    void aRequestTellsTheTargetAndNobodyElseThatTheirQueueMoved() throws Exception {
        String tag = WsRig.tag();
        String target = onboardedTraveler("frqt" + tag);
        String requester = onboardedTraveler("frqr" + tag);
        UUID targetId = tripRig.travelerIdOf(target);
        goPrivate(target);

        try (WsTestClient theirs = rig.connectAs(target)) {
            subscribeAsTraveler(theirs, targetId);

            follow(requester, targetId);

            JsonNode envelope =
                    json.readTree(theirs.awaitFrameContaining(FollowTopic.FOLLOW_REQUESTS_CHANGED));
            assertThat(envelope.path("topic").asString())
                    .as("The queue belongs to one traveler, so the frame is addressed to them by"
                            + " id rather than broadcast to anything wider.")
                    .isEqualTo("traveler:" + targetId);
            assertThat(envelope.path("payload").isNull())
                    .as("An audience of one needs no payload: the traveler asks REST for the row,"
                            + " which answers under rules the frame does not have to restate.")
                    .isTrue();
        }
    }

    @Test
    void withdrawingARequestTellsTheTargetTheirQueueMovedBack() throws Exception {
        String tag = WsRig.tag();
        String target = onboardedTraveler("frwt" + tag);
        String requester = onboardedTraveler("frwr" + tag);
        UUID targetId = tripRig.travelerIdOf(target);
        goPrivate(target);
        follow(requester, targetId);

        try (WsTestClient theirs = rig.connectAs(target)) {
            subscribeAsTraveler(theirs, targetId);

            unfollow(requester, targetId);

            JsonNode envelope =
                    json.readTree(theirs.awaitFrameContaining(FollowTopic.FOLLOW_REQUESTS_CHANGED));
            assertThat(envelope.path("payload").isNull())
                    .as("A withdrawal is a queue movement like any other. Without this the row"
                            + " lingers on an open list until the traveler leaves and comes back.")
                    .isTrue();
        }
    }

    @Test
    void approvingAnnouncesBothTheQueueAndTheNewFollower() throws Exception {
        String tag = WsRig.tag();
        String target = onboardedTraveler("frat" + tag);
        String requester = onboardedTraveler("frar" + tag);
        UUID targetId = tripRig.travelerIdOf(target);
        UUID requesterId = tripRig.travelerIdOf(requester);
        goPrivate(target);
        follow(requester, targetId);

        try (WsTestClient theirs = rig.connectAs(target)) {
            subscribeAsTraveler(theirs, targetId);

            approve(target, requesterId);

            assertThat(payloadOf(theirs, FollowTopic.FOLLOWERS_CHANGED))
                    .as("An approval both empties a queue row and makes an edge, so the two lists"
                            + " and the stats all move at once.")
                    .isTrue();
            assertThat(payloadOf(theirs, FollowTopic.FOLLOW_REQUESTS_CHANGED)).isTrue();
        }
    }

    @Test
    void decliningMovesTheQueueAndMakesNoFollower() throws Exception {
        String tag = WsRig.tag();
        String target = onboardedTraveler("frdt" + tag);
        String requester = onboardedTraveler("frdr" + tag);
        UUID targetId = tripRig.travelerIdOf(target);
        UUID requesterId = tripRig.travelerIdOf(requester);
        goPrivate(target);
        follow(requester, targetId);

        try (WsTestClient theirs = rig.connectAs(target)) {
            subscribeAsTraveler(theirs, targetId);

            decline(target, requesterId);

            assertThat(payloadOf(theirs, FollowTopic.FOLLOW_REQUESTS_CHANGED)).isTrue();
            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("Nobody was let in, so no follower list moved. A followers frame here"
                            + " would refetch two lists and a stat for a change that never was.")
                    .isTrue();
        }
    }

    @Test
    void followingAPublicProfileAnnouncesTheNewFollowerAndNoQueue() throws Exception {
        String tag = WsRig.tag();
        String followee = onboardedTraveler("frpt" + tag);
        String follower = onboardedTraveler("frpf" + tag);
        UUID followeeId = tripRig.travelerIdOf(followee);

        try (WsTestClient theirs = rig.connectAs(followee)) {
            subscribeAsTraveler(theirs, followeeId);

            follow(follower, followeeId);

            assertThat(payloadOf(theirs, FollowTopic.FOLLOWERS_CHANGED)).isTrue();
            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("A public profile keeps no queue, so a follow there is one event, not two.")
                    .isTrue();
        }
    }

    @Test
    void unfollowingAndBeingRemovedBothAnnounceTheFolloweeLostOne() throws Exception {
        String tag = WsRig.tag();
        String followee = onboardedTraveler("frut" + tag);
        String follower = onboardedTraveler("fruf" + tag);
        UUID followeeId = tripRig.travelerIdOf(followee);
        UUID followerId = tripRig.travelerIdOf(follower);
        follow(follower, followeeId);

        try (WsTestClient theirs = rig.connectAs(followee)) {
            subscribeAsTraveler(theirs, followeeId);

            unfollow(follower, followeeId);

            JsonNode envelope =
                    json.readTree(theirs.awaitFrameContaining(FollowTopic.FOLLOWERS_CHANGED));
            assertThat(envelope.path("topic").asString())
                    .as("The list that moved belongs to the followee, so the frame goes to them."
                            + " The one who left already knows.")
                    .isEqualTo("traveler:" + followeeId);
        }

        follow(follower, followeeId);

        try (WsTestClient theirs = rig.connectAs(followee)) {
            subscribeAsTraveler(theirs, followeeId);

            removeFollower(followee, followerId);

            assertThat(payloadOf(theirs, FollowTopic.FOLLOWERS_CHANGED))
                    .as("Removing a follower is the same loss by another hand, and the list must"
                            + " move without a refresh.")
                    .isTrue();
        }
    }

    @Test
    void goingPublicApprovesTheWaitingAndSaysSoOnce() throws Exception {
        String tag = WsRig.tag();
        String target = onboardedTraveler("frbt" + tag);
        String first = onboardedTraveler("frb1" + tag);
        String second = onboardedTraveler("frb2" + tag);
        UUID targetId = tripRig.travelerIdOf(target);
        goPrivate(target);
        follow(first, targetId);
        follow(second, targetId);

        try (WsTestClient theirs = rig.connectAs(target)) {
            subscribeAsTraveler(theirs, targetId);

            goPublic(target);

            assertThat(payloadOf(theirs, FollowTopic.FOLLOWERS_CHANGED))
                    .as("The flip approves everyone waiting, so the followers list moves for the"
                            + " batch as it would for one.")
                    .isTrue();
            assertThat(payloadOf(theirs, FollowTopic.FOLLOW_REQUESTS_CHANGED))
                    .as("And the queue empties, which is what drops the Follow requests row from"
                            + " the Account screen.")
                    .isTrue();
        }
    }

    @Test
    void aRepeatedFollowAndAnIdempotentDeleteAnnounceNothingAtAll() throws Exception {
        String tag = WsRig.tag();
        String followee = onboardedTraveler("frit" + tag);
        String follower = onboardedTraveler("frif" + tag);
        UUID followeeId = tripRig.travelerIdOf(followee);
        follow(follower, followeeId);

        try (WsTestClient theirs = rig.connectAs(followee)) {
            subscribeAsTraveler(theirs, followeeId);

            follow(follower, followeeId);
            unfollow(follower, followeeId);
            unfollow(follower, followeeId);

            assertThat(theirs.awaitFrameContaining(FollowTopic.FOLLOWERS_CHANGED)).isNotEmpty();
            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("Only the delete that actually removed an edge said anything. A frame per"
                            + " call would refetch three lists for two no-ops.")
                    .isTrue();
        }
    }

    private String onboardedTraveler(String handle) {
        String token = tripRig.travelerWithHandle(handle);
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }

    private boolean payloadOf(WsTestClient client, String type) throws Exception {
        return json.readTree(client.awaitFrameContaining(type)).path("payload").isNull();
    }

    private void subscribeAsTraveler(WsTestClient client, UUID travelerId) throws Exception {
        client.send(WsRig.subscribeTo("traveler:" + travelerId));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }

    private void goPrivate(String token) {
        setVisibility(token, "private");
    }

    private void goPublic(String token) {
        setVisibility(token, "public");
    }

    private void setVisibility(String token, String visibility) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"" + visibility + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void follow(String token, UUID followeeId) {
        rest.post()
                .uri("/v1/travelers/" + followeeId + "/follow")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }

    private void unfollow(String token, UUID followeeId) {
        rest.delete()
                .uri("/v1/travelers/" + followeeId + "/follow")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }

    private void approve(String token, UUID requesterId) {
        rest.post()
                .uri("/v1/me/follow-requests/" + requesterId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }

    private void decline(String token, UUID requesterId) {
        rest.post()
                .uri("/v1/me/follow-requests/" + requesterId + "/decline")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }

    private void removeFollower(String token, UUID followerId) {
        rest.delete()
                .uri("/v1/me/followers/" + followerId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .is2xxSuccessful();
    }
}
