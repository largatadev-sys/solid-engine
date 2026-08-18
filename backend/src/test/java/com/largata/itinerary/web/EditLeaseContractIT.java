package com.largata.itinerary.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class EditLeaseContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aMemberAcquiresAndAnotherIsRefusedWithTheHolderNamed() {
        String ownerToken = freshTraveler();
        String tripId = createTrip(ownerToken);
        String memberToken = admitNamedMemberTo(tripId, "Maria");

        UUID memberId = travelerIdOf(memberToken);
        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.holderId")
                .isEqualTo(memberId.toString());

        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED")
                .jsonPath("$.message")
                .value(message ->
                        org.assertj.core.api.Assertions.assertThat((String) message).contains("Maria"));
    }

    @Test
    void reAcquiringYourOwnLockSucceeds() {
        String token = freshTraveler();
        String tripId = createTrip(token);

        acquire(token, tripId);
        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    @Test
    void releaseFreesTheLockForTheNextMember() {
        String ownerToken = freshTraveler();
        String tripId = createTrip(ownerToken);
        String memberToken = admitNamedMemberTo(tripId, "Maria");

        acquire(ownerToken, tripId);
        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        rest.method(HttpMethod.DELETE)
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk();
    }

    @Test
    void releaseIsIdempotentWhenNothingIsHeld() {
        String token = freshTraveler();
        String tripId = createTrip(token);

        rest.method(HttpMethod.DELETE)
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    @Test
    void renewByANonHolderIsALockConflict() {
        String ownerToken = freshTraveler();
        String tripId = createTrip(ownerToken);
        String memberToken = admitNamedMemberTo(tripId, "Maria");

        acquire(memberToken, tripId);
        rest.post()
                .uri(lockUri(tripId) + "/renew")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");
    }

    @Test
    void aNonMemberIsMaskedOnEveryLockEndpoint() {
        String ownerToken = freshTraveler();
        String tripId = createTrip(ownerToken);
        String stranger = freshTraveler();

        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.post()
                .uri(lockUri(tripId) + "/renew")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.method(HttpMethod.DELETE)
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void aVisitorWithNoTokenIsRejectedAtTheSecurityChain() {
        rest.post()
                .uri("/v1/itineraries/" + UUID.randomUUID() + "/edit-lock")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }


    private static String lockUri(String tripId) {
        return "/v1/itineraries/" + tripId + "/edit-lock";
    }

    private void acquire(String token, String tripId) {
        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destination":"Palawan","durationDays":1}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }


    private String admitNamedMemberTo(String itineraryId, String displayName) {
        String uid = "uid-" + UUID.randomUUID();
        String memberToken = TestJwtSupport.tokenWithName(uid, uid + "@example.com", displayName);
        UUID memberId = travelerIdOf(memberToken);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                memberId,
                Timestamp.from(Instant.now()));
        return memberToken;
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

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
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
