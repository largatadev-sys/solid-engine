package com.largata.membership;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DepartureFreesEditLockIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void removingTheLockHolderFreesThePlanImmediately() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);

        acquire(memberToken, trip).expectStatus().isOk();
        acquire(ownerToken, trip).expectStatus().isEqualTo(409);

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void leavingFreesTheLockTheLeaverWasHolding() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);

        acquire(memberToken, trip).expectStatus().isOk();
        remove(memberToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void aDepartureLeavesSomebodyElsesLockAlone() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        String bystanderToken = joinAsMember(ownerToken, trip);

        acquire(ownerToken, trip).expectStatus().isOk();

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(bystanderToken, trip).expectStatus().isEqualTo(409);
    }


    private RestTestClient.ResponseSpec acquire(String token, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec remove(String callerToken, String tripId, UUID targetId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private String joinAsMember(String ownerToken, String tripId) {
        String email = "traveler-" + UUID.randomUUID() + "@example.com";
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"email\":\"" + email + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String memberToken = TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
        rest.post()
                .uri("/v1/invitations/" + fieldIn(body, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk();
        return memberToken;
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destinations":["Palawan"]}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    private UUID travelerIdOf(String token) {
        return UUID.fromString(
                fieldIn(
                        rest.get()
                                .uri("/v1/me")
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id"));
    }

    private static String verified() {
        return TestJwtSupport.verifiedToken(
                "uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }
}
