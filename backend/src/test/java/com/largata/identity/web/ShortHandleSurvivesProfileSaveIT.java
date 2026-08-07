package com.largata.identity.web;

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
class ShortHandleSurvivesProfileSaveIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aTravelerHoldingATwoCharacterHandleCanStillSaveTheirProfile() {
        String uid = freshUid();
        String token = signIn(uid);
        String planted = plantShortHandle(uid);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + planted + "\",\"displayName\":\"Founder\",\"bio\":\"Building Largata.\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .isEqualTo(planted)
                .jsonPath("$.bio")
                .isEqualTo("Building Largata.");
    }


    @Test
    void anUnchangedHandleIsAcceptedWhateverItsCaseInTheRequest() {
        String uid = freshUid();
        String token = signIn(uid);
        String planted = plantShortHandle(uid);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + planted.toUpperCase(java.util.Locale.ROOT) + "\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .isEqualTo(planted);
    }


    @Test
    void aSingleCharacterHandleIsStillRefused() {
        String uid = freshUid();
        String token = signIn(uid);
        plantShortHandle(uid);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"x\"}")
                .exchange()
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void aTakenShortHandleIsStillRefusedToEveryoneElse() {
        String owner = freshUid();
        signIn(owner);
        String taken = plantShortHandle(owner);

        String other = freshUid();
        String otherToken = signIn(other);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + taken + "\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT);
    }


    @Test
    void aShortHandleIsInvitableByHandleLikeAnyOther() {
        String uid = freshUid();
        signIn(uid);
        String planted = plantShortHandle(uid);

        rest.get()
                .uri("/v1/handles/" + planted)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + signIn(freshUid()))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .isEqualTo(planted);
    }


    private String signIn(String uid) {
        String token = TestJwtSupport.tokenFor(uid, uid + "@example.com");
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private String plantShortHandle(String uid) {
        String handle = freshShortHandle();
        jdbc.update("UPDATE traveler SET handle = ? WHERE firebase_uid = ?", handle, uid);
        return handle;
    }


    private static String freshShortHandle() {
        String alphabet = "abcdefghijklmnopqrstuvwxyz";
        int taken = SHORT_HANDLES_TAKEN.getAndIncrement();
        return "" + alphabet.charAt(taken / alphabet.length() % alphabet.length())
                + alphabet.charAt(taken % alphabet.length());
    }


    private static final java.util.concurrent.atomic.AtomicInteger SHORT_HANDLES_TAKEN =
            new java.util.concurrent.atomic.AtomicInteger();


    private String freshUid() {
        return "uid-" + UUID.randomUUID();
    }
}
