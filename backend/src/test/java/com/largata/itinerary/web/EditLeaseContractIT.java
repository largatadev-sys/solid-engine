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

/**
 * The edit-lock endpoints over HTTP (S1.4, ticket 01, spec ACs 1–3, 9): acquire, the holder-naming
 * 409 a second member gets, release, the owner locked out equally, and the guard masking a non-member
 * before any lock state is revealed.
 *
 * <p><strong>The holder-naming 409 is the story's point at this seam.</strong> A live lease answers a
 * different member's acquire with {@code 409 EDIT_LOCKED} whose message contains the holder's display
 * name — that is what the client's "{name} is editing this itinerary right now" modal shows. Expiry
 * and renewal are proven at the service seam under a controlled clock ({@code EditLeaseExpiryIT});
 * here the TTL is the real 3 minutes and no test needs to outlast it.
 *
 * <p>The member fixture matches {@code DayContractIT}: a second traveler admitted directly as a
 * {@code MEMBER} (the state a real S1.2 accept produces), with a display name set so the 409 has a
 * name to carry.
 */
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

        // The member (Maria) acquires the lock — 200, and the response says she holds it.
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

        // The owner tries to acquire — 409, and the message names Maria (no force-take, owner included).
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
        // Re-entering an edit surface you already hold must not fail — it renews.
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
        // While the owner holds it, the member is refused.
        rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        // The owner releases — 204.
        rest.method(HttpMethod.DELETE)
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isNoContent();

        // Now the member acquires with no wait.
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

        // Releasing with no lease held is a no-op 204, never an error — a best-effort release on
        // navigate-away must not fail.
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
        // The owner never held the lock, so a renew is a 409 (not silently granted).
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

        // A stranger learns nothing about the lock — 404, the guard's mask, on acquire, renew, release.
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

    // --- fixtures ---------------------------------------------------------------------------------

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
                                {"title":"Trip","destinations":["Palawan"],"durationDays":1}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    /** Admits a second traveler as a MEMBER with a known display name, so the 409 has a name to carry. */
    private String admitNamedMemberTo(String itineraryId, String displayName) {
        String uid = "uid-" + UUID.randomUUID();
        String memberToken = TestJwtSupport.tokenWithName(uid, uid + "@example.com", displayName);
        UUID memberId = travelerIdOf(memberToken); // provisions the traveler (with the name claim)
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
