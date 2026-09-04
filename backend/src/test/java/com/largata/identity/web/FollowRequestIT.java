package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
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
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class FollowRequestIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void followingAPublicTravelerStillSaysFollowingAndStillCreatesTheEdge() {
        Traveler follower = onboarded();
        Traveler followed = onboarded();

        follow(follower, followed)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("following");

        assertThat(edgeRows(follower, followed)).isEqualTo(1);
        assertThat(requestRows(follower, followed)).isZero();
    }


    @Test
    void followingAPrivateTravelerAsksInsteadOfFollowing() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);

        follow(requester, owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("requested");

        assertThat(edgeRows(requester, owner)).as("no edge until the owner says so").isZero();
        assertThat(pendingRows(requester, owner)).isEqualTo(1);
    }


    @Test
    void askingTwiceFindsTheStandingRequestRatherThanCreatingASecond() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);

        follow(requester, owner).expectStatus().isOk();
        follow(requester, owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("requested");

        assertThat(requestRows(requester, owner)).isEqualTo(1);
    }


    @Test
    void anExistingFollowerOfANowPrivateProfileStillReadsAsFollowing() {
        Traveler follower = onboarded();
        Traveler owner = onboarded();
        follow(follower, owner).expectStatus().isOk();
        goPrivate(owner);

        follow(follower, owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("following");

        assertThat(requestRows(follower, owner)).as("an edge is never downgraded to an ask").isZero();
    }


    @Test
    void theOwnersInboxListsThePendingRequesterAndTheProfileSaysRequested() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();

        inbox(owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].traveler.handle")
                .isEqualTo(requester.handle())
                .jsonPath("$.items[0].requestedAt")
                .exists();

        profile(owner.handle(), requester)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("requested");
    }


    @Test
    void approvingCreatesTheEdgeAndOpensEveryFenceToThatRequester() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();
        refusedAsPrivate(followers(owner.handle(), requester));

        approve(owner, requester).expectStatus().isNoContent();

        assertThat(edgeRows(requester, owner)).isEqualTo(1);
        followers(owner.handle(), requester).expectStatus().isOk();
        diaryTrips(owner.handle(), requester).expectStatus().isOk();
        profile(owner.handle(), requester)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("following");
    }


    @Test
    void decliningIsSilentAndLeavesTheRequesterExactlyWhereTheyStarted() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();

        decline(owner, requester).expectStatus().isNoContent();

        assertThat(edgeRows(requester, owner)).isZero();
        assertThat(pendingRows(requester, owner)).isZero();
        profile(owner.handle(), requester)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");
        refusedAsPrivate(followers(owner.handle(), requester));
    }


    @Test
    void aDeclinedTravelerMayAskAgainAtOnce() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();
        decline(owner, requester).expectStatus().isNoContent();

        follow(requester, owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("requested");

        assertThat(pendingRows(requester, owner)).isEqualTo(1);
        assertThat(requestRows(requester, owner)).as("the decline stays on the record").isEqualTo(2);
    }


    @Test
    void unfollowCancelsAPendingRequest() {
        Traveler requester = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();

        unfollow(requester, owner).expectStatus().isNoContent();

        assertThat(pendingRows(requester, owner)).isZero();
        profile(owner.handle(), requester)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");
    }


    @Test
    void approvingOrDecliningWithNothingPendingIsRefusedByName() {
        Traveler stranger = onboarded();
        Traveler owner = onboarded();
        goPrivate(owner);

        notFound(approve(owner, stranger));
        notFound(decline(owner, stranger));

        follow(stranger, owner).expectStatus().isOk();
        approve(owner, stranger).expectStatus().isNoContent();
        notFound(approve(owner, stranger));
    }


    @Test
    void goingPublicApprovesEveryPendingRequestAndEmptiesTheInbox() {
        Traveler owner = onboarded();
        Traveler first = onboarded();
        Traveler second = onboarded();
        Traveler third = onboarded();
        goPrivate(owner);
        follow(first, owner).expectStatus().isOk();
        follow(second, owner).expectStatus().isOk();
        follow(third, owner).expectStatus().isOk();

        setVisibility(owner, "public");

        assertThat(edgeRows(first, owner)).isEqualTo(1);
        assertThat(edgeRows(second, owner)).isEqualTo(1);
        assertThat(edgeRows(third, owner)).isEqualTo(1);
        assertThat(pendingRowsFor(owner)).isZero();
        inbox(owner).expectStatus().isOk().expectBody().jsonPath("$.items").isEmpty();
    }


    @Test
    void removingAFollowerIsSilentAndSendsThemBackToNone() {
        Traveler owner = onboarded();
        Traveler follower = onboarded();
        follow(follower, owner).expectStatus().isOk();
        goPrivate(owner);

        removeFollower(owner, follower).expectStatus().isNoContent();

        assertThat(edgeRows(follower, owner)).isZero();
        profile(owner.handle(), follower)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");
        refusedAsPrivate(followers(owner.handle(), follower));
    }


    @Test
    void removingAlsoCancelsAPendingRequest_soRemovalAlwaysMeansNone() {
        Traveler owner = onboarded();
        Traveler asker = onboarded();
        goPrivate(owner);
        follow(asker, owner).expectStatus().isOk();

        removeFollower(owner, asker).expectStatus().isNoContent();

        assertThat(pendingRows(asker, owner))
                .as("saying no is always available — a pending ask survives no removal")
                .isZero();
        profile(owner.handle(), asker)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");
    }


    @Test
    void removingAFollowerWorksOnAPublicProfileAndIsIdempotent() {
        Traveler owner = onboarded();
        Traveler follower = onboarded();
        follow(follower, owner).expectStatus().isOk();

        removeFollower(owner, follower).expectStatus().isNoContent();
        removeFollower(owner, follower).expectStatus().isNoContent();

        assertThat(edgeRows(follower, owner)).isZero();
    }


    @Test
    void aRemovedFollowerMayComeBack() {
        Traveler owner = onboarded();
        Traveler follower = onboarded();
        follow(follower, owner).expectStatus().isOk();
        removeFollower(owner, follower).expectStatus().isNoContent();

        assertThat(pendingRows(follower, owner))
                .as("the removal itself creates no request")
                .isZero();

        follow(follower, owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("following");
    }


    @Test
    void theCountsFollowApprovalsAndRemovals() {
        Traveler owner = onboarded();
        Traveler requester = onboarded();
        goPrivate(owner);
        follow(requester, owner).expectStatus().isOk();

        profile(owner.handle(), owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.followersCount")
                .isEqualTo(0);

        approve(owner, requester).expectStatus().isNoContent();
        profile(owner.handle(), owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.followersCount")
                .isEqualTo(1);

        removeFollower(owner, requester).expectStatus().isNoContent();
        profile(owner.handle(), owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.followersCount")
                .isEqualTo(0);
    }


    @Test
    void aTravelerCannotRemoveThemselves() {
        Traveler lonely = onboarded();

        removeFollower(lonely, lonely).expectStatus().isBadRequest();
    }


    private void notFound(RestTestClient.ResponseSpec response) {
        response
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("FOLLOW_REQUEST_NOT_FOUND");
    }


    private void refusedAsPrivate(RestTestClient.ResponseSpec response) {
        response.expectStatus().isForbidden().expectBody().jsonPath("$.code").isEqualTo("PROFILE_PRIVATE");
    }


    private RestTestClient.ResponseSpec follow(Traveler follower, Traveler followed) {
        return rest.post()
                .uri("/v1/travelers/" + idOf(followed) + "/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange();
    }


    private RestTestClient.ResponseSpec unfollow(Traveler follower, Traveler followed) {
        return rest.delete()
                .uri("/v1/travelers/" + idOf(followed) + "/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange();
    }


    private RestTestClient.ResponseSpec approve(Traveler owner, Traveler requester) {
        return decide(owner, requester, "approve");
    }


    private RestTestClient.ResponseSpec decline(Traveler owner, Traveler requester) {
        return decide(owner, requester, "decline");
    }


    private RestTestClient.ResponseSpec decide(Traveler owner, Traveler requester, String verb) {
        return rest.post()
                .uri("/v1/me/follow-requests/" + idOf(requester) + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.token()))
                .exchange();
    }


    private RestTestClient.ResponseSpec removeFollower(Traveler owner, Traveler follower) {
        return rest.delete()
                .uri("/v1/me/followers/" + idOf(follower))
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.token()))
                .exchange();
    }


    private RestTestClient.ResponseSpec inbox(Traveler owner) {
        return get("/v1/me/follow-requests", owner);
    }


    private RestTestClient.ResponseSpec profile(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle, viewer);
    }


    private RestTestClient.ResponseSpec followers(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle + "/followers", viewer);
    }


    private RestTestClient.ResponseSpec diaryTrips(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle + "/diary/trips", viewer);
    }


    private RestTestClient.ResponseSpec get(String uri, Traveler viewer) {
        return rest.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(viewer.token())).exchange();
    }


    private long edgeRows(Traveler follower, Traveler followed) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow WHERE follower_id = ? AND followee_id = ?",
                Long.class,
                idOf(follower),
                idOf(followed));
    }


    private long requestRows(Traveler requester, Traveler target) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow_request WHERE requester_id = ? AND target_id = ?",
                Long.class,
                idOf(requester),
                idOf(target));
    }


    private long pendingRows(Traveler requester, Traveler target) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow_request "
                        + "WHERE requester_id = ? AND target_id = ? AND status = 'PENDING'",
                Long.class,
                idOf(requester),
                idOf(target));
    }


    private long pendingRowsFor(Traveler target) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow_request WHERE target_id = ? AND status = 'PENDING'",
                Long.class,
                idOf(target));
    }


    private void goPrivate(Traveler traveler) {
        setVisibility(traveler, "private");
    }


    private void setVisibility(Traveler traveler, String visibility) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"" + visibility + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private UUID idOf(Traveler traveler) {
        String body =
                new String(
                        get("/v1/me", traveler)
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


    private Traveler onboarded() {
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");
        String handle = "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return new Traveler(token, handle);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private record Traveler(String token, String handle) {}
}
