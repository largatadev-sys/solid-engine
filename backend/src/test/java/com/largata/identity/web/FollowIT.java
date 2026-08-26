package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class FollowIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> events;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        events = new ListAppender<>();
        events.start();
        analyticsLogger().addAppender(events);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger().detachAppender(events);
    }


    @Test
    void followingATravelerMovesBothProfilesAndSaysSoToEachViewer() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        follow(follower, followed).expectStatus().isNoContent();

        assertThat(profileOf(followed.handle(), follower)).contains("\"followersCount\":1");
        assertThat(profileOf(followed.handle(), follower)).contains("\"followedByViewer\":true");
        assertThat(profileOf(follower.handle(), followed)).contains("\"followingCount\":1");
        assertThat(profileOf(follower.handle(), followed))
                .as("the followed traveler sees that this viewer follows them")
                .contains("\"followsViewer\":true");
    }


    @Test
    void aSecondFollowChangesNothing() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        follow(follower, followed).expectStatus().isNoContent();
        follow(follower, followed).expectStatus().isNoContent();

        assertThat(profileOf(followed.handle(), follower)).contains("\"followersCount\":1");
        assertThat(edgeRowsBetween(follower, followed)).isEqualTo(1);
    }


    @Test
    void unfollowingIsIdempotentAndNeedsNoPriorEdge() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        unfollow(follower, followed).expectStatus().isNoContent();
        follow(follower, followed).expectStatus().isNoContent();
        unfollow(follower, followed).expectStatus().isNoContent();
        unfollow(follower, followed).expectStatus().isNoContent();

        assertThat(profileOf(followed.handle(), follower)).contains("\"followersCount\":0");
        assertThat(profileOf(followed.handle(), follower)).contains("\"followedByViewer\":false");
        assertThat(edgeRowsBetween(follower, followed)).isZero();
    }


    @Test
    void followIsAsymmetricSoFollowingBackIsASecondIndependentEdge() {
        Traveler one = onboarded();
        Traveler other = onboarded();

        follow(one, other).expectStatus().isNoContent();

        assertThat(profileOf(other.handle(), one))
                .as("one follows other, but other does not follow back yet")
                .contains("\"followedByViewer\":true")
                .contains("\"followsViewer\":false");

        follow(other, one).expectStatus().isNoContent();

        assertThat(profileOf(other.handle(), one))
                .contains("\"followedByViewer\":true")
                .contains("\"followsViewer\":true");
    }


    @Test
    void theEndpointRefusesASelfFollow() {
        Traveler alone = onboarded();

        follow(alone, alone)
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("FOLLOW_SELF");
    }


    @Test
    void theConstraintRefusesASelfFollowIndependentlyOfTheEndpoint() {
        Traveler alone = onboarded();
        UUID id = idOf(alone);

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO follow (follower_id, followee_id) VALUES (?, ?)",
                                        id,
                                        id))
                .as("the endpoint check is not the only guard — the table refuses it too")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void theSamePairCannotBeStoredTwiceEvenBehindTheServicesBack() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();
        follow(follower, followed).expectStatus().isNoContent();

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO follow (follower_id, followee_id) VALUES (?, ?)",
                                        idOf(follower),
                                        idOf(followed)))
                .as("the composite primary key is what makes the insert idempotent")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void anUnknownAndAnUnonboardedTargetAreEquallyUnfollowable() {
        Traveler follower = onboarded();
        String unonboarded = freshTraveler();
        claimHandle(unonboarded, handle());

        for (UUID target : List.of(UUID.randomUUID(), idOf(unonboarded))) {
            rest.post()
                    .uri(followUri(target))
                    .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                    .exchange()
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("TRAVELER_NOT_FOUND");
        }
    }


    @Test
    void bothMutationsRefuseAnUnauthenticatedCaller() {
        Traveler followed = onboarded();

        rest.post().uri(followUri(idOf(followed))).exchange().expectStatus().isUnauthorized();
        rest.delete().uri(followUri(idOf(followed))).exchange().expectStatus().isUnauthorized();
    }


    @Test
    void aFollowAndAnUnfollowAreEachMeasuredOnceCarryingIdsAndNothingElse() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        follow(follower, followed).expectStatus().isNoContent();
        follow(follower, followed).expectStatus().isNoContent();
        unfollow(follower, followed).expectStatus().isNoContent();
        unfollow(follower, followed).expectStatus().isNoContent();

        assertThat(eventsNamed("follow_created"))
                .as("the second follow wrote nothing, so it measured nothing")
                .hasSize(1);
        assertThat(eventsNamed("follow_removed")).hasSize(1);
    }


    @Test
    void aProfileNobodyFollowsReadsAsZeroRatherThanAbsent() {
        Traveler subject = onboarded();
        Traveler viewer = onboarded();

        assertThat(profileOf(subject.handle(), viewer))
                .contains("\"followersCount\":0")
                .contains("\"followingCount\":0")
                .contains("\"followedByViewer\":false")
                .contains("\"followsViewer\":false");
    }


    @Test
    void theOwnStatsReadCarriesTheSameCountsAsThePublicProfile() {
        Traveler subject = onboarded();
        Traveler followerOne = onboarded();
        Traveler followerTwo = onboarded();

        follow(followerOne, subject).expectStatus().isNoContent();
        follow(followerTwo, subject).expectStatus().isNoContent();
        follow(subject, followerOne).expectStatus().isNoContent();

        String stats =
                new String(
                        rest.get()
                                .uri("/v1/me/profile/stats")
                                .header(HttpHeaders.AUTHORIZATION, bearer(subject.token()))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());

        assertThat(stats).contains("\"followersCount\":2").contains("\"followingCount\":1");
        assertThat(profileOf(subject.handle(), followerOne))
                .as("the two rows agree, which is the whole point of aligning them")
                .contains("\"followersCount\":2")
                .contains("\"followingCount\":1");
    }


    @Test
    void aMutationAddressedByHandleRatherThanIdIsRefused() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        rest.post()
                .uri("/v1/travelers/" + followed.handle() + "/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange()
                .expectStatus()
                .is4xxClientError();

        assertThat(edgeRowsBetween(follower, followed))
                .as("a label must never route a mutation (ADR-015)")
                .isZero();
    }


    private RestTestClient.ResponseSpec follow(Traveler follower, Traveler followed) {
        return rest.post()
                .uri(followUri(idOf(followed)))
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange();
    }


    private RestTestClient.ResponseSpec unfollow(Traveler follower, Traveler followed) {
        return rest.delete()
                .uri(followUri(idOf(followed)))
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange();
    }


    private String profileOf(String handle, Traveler viewer) {
        return new String(
                rest.get()
                        .uri("/v1/travelers/" + handle)
                        .header(HttpHeaders.AUTHORIZATION, bearer(viewer.token()))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private long edgeRowsBetween(Traveler follower, Traveler followed) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow WHERE follower_id = ? AND followee_id = ?",
                Long.class,
                idOf(follower),
                idOf(followed));
    }


    private Traveler onboarded() {
        String token = freshTraveler();
        String handle = handle();
        claimHandle(token, handle);
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return new Traveler(token, handle);
    }


    private void claimHandle(String token, String handle) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private UUID idOf(Traveler traveler) {
        return idOf(traveler.token());
    }


    private UUID idOf(String token) {
        String body =
                new String(
                        rest.get()
                                .uri("/v1/me")
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());
        java.util.regex.Matcher found =
                java.util.regex.Pattern.compile("\"id\"\\s*:\\s*\"([0-9a-f-]{36})\"").matcher(body);
        if (!found.find()) {
            throw new AssertionError("no traveler id in " + body);
        }
        return UUID.fromString(found.group(1));
    }


    private List<ILoggingEvent> eventsNamed(String name) {
        return events.list.stream()
                .filter(line -> line.getFormattedMessage().equals("event=" + name))
                .toList();
    }


    private static String followUri(UUID travelerId) {
        return "/v1/travelers/" + travelerId + "/follow";
    }


    private static String freshTraveler() {
        String uid = "uid-" + UUID.randomUUID();
        return TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }


    private record Traveler(String token, String handle) {}
}
