package com.largata.identity.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PrivateProfileFenceIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aStrangerReadsThePrivateProfileItselfAndIsRefusedByNameOnEveryList() {
        Traveler owner = onboarded();
        Traveler stranger = onboarded();
        goPrivate(owner);

        profile(owner.handle(), stranger)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("private")
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");

        refusedAsPrivate(diaryTrips(owner.handle(), stranger));
        refusedAsPrivate(followers(owner.handle(), stranger));
        refusedAsPrivate(following(owner.handle(), stranger));
    }


    @Test
    void theOwnerReadsTheirOwnListsWhilePrivate() {
        Traveler owner = onboarded();
        goPrivate(owner);

        diaryTrips(owner.handle(), owner).expectStatus().isOk();
        followers(owner.handle(), owner).expectStatus().isOk();
        following(owner.handle(), owner).expectStatus().isOk();
    }


    @Test
    void anApprovedFollowerReadsEveryListTheStrangerWasRefused() {
        Traveler owner = onboarded();
        Traveler follower = onboarded();
        follow(follower, owner);
        goPrivate(owner);

        diaryTrips(owner.handle(), follower).expectStatus().isOk();
        followers(owner.handle(), follower).expectStatus().isOk();
        following(owner.handle(), follower).expectStatus().isOk();

        profile(owner.handle(), follower)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("following");
    }


    @Test
    void aPublicProfileAnswersEveryListToAStranger_soTheDefaultIsUntouched() {
        Traveler owner = onboarded();
        Traveler stranger = onboarded();

        profile(owner.handle(), stranger)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("public")
                .jsonPath("$.viewerRelation")
                .isEqualTo("none");

        diaryTrips(owner.handle(), stranger).expectStatus().isOk();
        followers(owner.handle(), stranger).expectStatus().isOk();
        following(owner.handle(), stranger).expectStatus().isOk();
    }


    @Test
    void thePublishedShowcaseIsNeverFenced_whoeverPublishedIt() {
        Traveler owner = onboarded();
        Traveler stranger = onboarded();
        goPrivate(owner);

        rest.get()
                .uri("/v1/travelers/" + owner.handle() + "/published")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger.token()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void theHeaderAndTheFourCountsRenderForAStranger_becauseACountLeaksNothing() {
        Traveler owner = onboarded();
        Traveler stranger = onboarded();
        goPrivate(owner);

        profile(owner.handle(), stranger)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.traveler.handle")
                .isEqualTo(owner.handle())
                .jsonPath("$.followersCount")
                .isEqualTo(0)
                .jsonPath("$.followingCount")
                .isEqualTo(0)
                .jsonPath("$.publishedCount")
                .isEqualTo(0)
                .jsonPath("$.destinationCount")
                .isEqualTo(0);
    }


    @Test
    void goingPublicAgainOpensEveryListWithoutAnybodyRefollowing() {
        Traveler owner = onboarded();
        Traveler stranger = onboarded();
        goPrivate(owner);
        refusedAsPrivate(followers(owner.handle(), stranger));

        setVisibility(owner, "public");

        followers(owner.handle(), stranger).expectStatus().isOk();
        diaryTrips(owner.handle(), stranger).expectStatus().isOk();
    }


    @Test
    void goingPrivateKeepsEveryExistingFollower() {
        Traveler owner = onboarded();
        Traveler follower = onboarded();
        follow(follower, owner);
        followers(owner.handle(), follower).expectStatus().isOk();

        goPrivate(owner);

        followers(owner.handle(), follower).expectStatus().isOk();
        profile(owner.handle(), follower)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRelation")
                .isEqualTo("following");
    }


    @Test
    void meCarriesTheTravelersOwnVisibility() {
        Traveler owner = onboarded();

        me(owner).expectStatus().isOk().expectBody().jsonPath("$.profileVisibility").isEqualTo("public");

        goPrivate(owner);

        me(owner).expectStatus().isOk().expectBody().jsonPath("$.profileVisibility").isEqualTo("private");
    }


    @Test
    void aPatchThatMentionsNoVisibilityLeavesItAlone() {
        Traveler owner = onboarded();
        goPrivate(owner);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"bio\":\"Still here\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.profileVisibility")
                .isEqualTo("private");
    }


    @Test
    void aVisibilityThatIsNeitherIsTheOrdinaryValidationRefusal() {
        Traveler owner = onboarded();

        setVisibilityRaw(owner, "friends")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PROFILE_VISIBILITY_UNKNOWN");
    }


    private void refusedAsPrivate(RestTestClient.ResponseSpec response) {
        response.expectStatus().isForbidden().expectBody().jsonPath("$.code").isEqualTo("PROFILE_PRIVATE");
    }


    private RestTestClient.ResponseSpec profile(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle, viewer);
    }


    private RestTestClient.ResponseSpec diaryTrips(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle + "/diary/trips", viewer);
    }


    private RestTestClient.ResponseSpec followers(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle + "/followers", viewer);
    }


    private RestTestClient.ResponseSpec following(String handle, Traveler viewer) {
        return get("/v1/travelers/" + handle + "/following", viewer);
    }


    private RestTestClient.ResponseSpec me(Traveler traveler) {
        return get("/v1/me", traveler);
    }


    private RestTestClient.ResponseSpec get(String uri, Traveler viewer) {
        return rest.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(viewer.token())).exchange();
    }


    private void follow(Traveler follower, Traveler followed) {
        rest.post()
                .uri("/v1/travelers/" + idOf(followed) + "/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(follower.token()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void goPrivate(Traveler traveler) {
        setVisibility(traveler, "private");
    }


    private void setVisibility(Traveler traveler, String visibility) {
        setVisibilityRaw(traveler, visibility).expectStatus().isOk();
    }


    private RestTestClient.ResponseSpec setVisibilityRaw(Traveler traveler, String visibility) {
        return rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"" + visibility + "\"}")
                .exchange();
    }


    private UUID idOf(Traveler traveler) {
        String body =
                new String(
                        me(traveler).expectStatus().isOk().expectBody().returnResult().getResponseBodyContent());
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
