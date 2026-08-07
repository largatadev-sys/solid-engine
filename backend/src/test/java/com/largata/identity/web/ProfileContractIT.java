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
class ProfileContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aFreshTravelerHasNoHandleAndACollisionFreeSuggestionToPrefillWith() {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenWithName("Ana Silva")))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .doesNotExist()
                .jsonPath("$.suggestedHandle")
                .isEqualTo("anasilva")
                .jsonPath("$.onboardingCompleted")
                .isEqualTo(false);
    }

    @Test
    void aGoogleSignInArrivesWithItsNameAndPhotoAlreadyOnTheProfile() {
        String uid = "uid-" + UUID.randomUUID();
        String photo = "https://lh3.googleusercontent.com/a/" + uid;

        rest.get()
                .uri("/v1/me")
                .header(
                        HttpHeaders.AUTHORIZATION,
                        bearer(TestJwtSupport.googleToken(uid, uid + "@example.com", "Ana Silva", photo)))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Ana Silva")
                .jsonPath("$.avatarUrl")
                .isEqualTo(photo);
    }

    @Test
    void anEmailSignUpBringsNoPhotoAndGetsInitialsOnTheClientInstead() {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token()))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.avatarUrl")
                .doesNotExist();
    }

    @Test
    void claimingAHandleStoresItLowercasedAndSuggestsItBackFromThenOn() {
        String token = token();

        patch(token, "{\"handle\":\"" + freshHandle().toUpperCase(java.util.Locale.ROOT) + "\"}")
                .expectStatus()
                .isOk();

        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectBody()
                .jsonPath("$.handle")
                .value(handle -> org.assertj.core.api.Assertions.assertThat((String) handle)
                        .isLowerCase());
    }

    @Test
    void theAvailabilityEndpointIsTruthfulAboutEveryVerdict() {
        String token = token();
        String handle = freshHandle();

        availability(token, handle).expectBody().jsonPath("$.available").isEqualTo(true);

        patch(token, "{\"handle\":\"" + handle + "\"}").expectStatus().isOk();

        availability(token(), handle)
                .expectBody()
                .jsonPath("$.available")
                .isEqualTo(false)
                .jsonPath("$.status")
                .isEqualTo("TAKEN");

        availability(token, "a").expectBody().jsonPath("$.status").isEqualTo("MALFORMED");
        availability(token, "admin").expectBody().jsonPath("$.status").isEqualTo("RESERVED");
    }

    @Test
    void myOwnHandleReadsAvailableToMeSoReSavingAnUnchangedProfileIsNotABlockedEdit() {
        String token = token();
        String handle = freshHandle();
        patch(token, "{\"handle\":\"" + handle + "\"}").expectStatus().isOk();

        availability(token, handle).expectBody().jsonPath("$.available").isEqualTo(true);
    }

    @Test
    void aHandleTakenByAnotherAccountIsRefusedEvenInADifferentCase() {
        String handle = freshHandle();
        patch(token(), "{\"handle\":\"" + handle + "\"}").expectStatus().isOk();

        patch(token(), "{\"handle\":\"" + handle.toUpperCase(java.util.Locale.ROOT) + "\"}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("HANDLE_TAKEN");
    }

    @Test
    void aReservedHandleIsRefusedWithItsOwnCode() {
        patch(token(), "{\"handle\":\"admin\"}")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("HANDLE_RESERVED");
    }

    @Test
    void aMalformedHandleIsRefusedWithItsOwnCode() {
        patch(token(), "{\"handle\":\"ana silva\"}")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("HANDLE_MALFORMED");
    }

    @Test
    void changingMyHandleReleasesTheOldOneForSomebodyElseImmediately() {
        String token = token();
        String first = freshHandle();
        String second = freshHandle();
        patch(token, "{\"handle\":\"" + first + "\"}").expectStatus().isOk();

        patch(token, "{\"handle\":\"" + second + "\"}").expectStatus().isOk();

        patch(token(), "{\"handle\":\"" + first + "\"}").expectStatus().isOk();
    }

    @Test
    void aPatchTouchesOnlyTheFieldsItCarries() {
        String token = token();
        patch(token, "{\"handle\":\"" + freshHandle() + "\",\"bio\":\"Chasing ferries.\"}")
                .expectStatus()
                .isOk();

        patch(token, "{\"displayName\":\"Ana S\"}")
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("Ana S")
                .jsonPath("$.bio")
                .isEqualTo("Chasing ferries.");
    }

    @Test
    void anUnauthenticatedCallerCannotReadOrWriteAProfile() {
        rest.patch()
                .uri("/v1/me")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"someone\"}")
                .exchange()
                .expectStatus()
                .isUnauthorized();

        rest.get().uri("/v1/handles/someone/availability").exchange().expectStatus().isUnauthorized();
    }

    private RestTestClient.ResponseSpec patch(String token, String body) {
        return rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec availability(String token, String handle) {
        return rest.get()
                .uri("/v1/handles/" + handle + "/availability")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private static String token() {
        String uid = "uid-" + UUID.randomUUID();
        return TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }

    private static String tokenWithName(String name) {
        String uid = "uid-" + UUID.randomUUID();
        return TestJwtSupport.verifiedTokenWithName(uid, uid + "@example.com", name);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String freshHandle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
