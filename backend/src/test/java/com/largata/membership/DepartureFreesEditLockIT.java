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

/**
 * Spec AC 8: a departing member's edit lease dies with their membership, in the same transaction.
 *
 * <p><strong>What would happen without it, and why that is the bug worth a test.</strong> Safety never
 * depended on this — the guard 404-masks an ex-member instantly, so they cannot write whatever the
 * lease says. The victim is everyone else: the lease row stays live for up to a full TTL, so the next
 * member to open the plan is told "«the person you just removed» is editing this itinerary right now".
 * The invariant being kept is <strong>a lease holder is always a member</strong>, and departure is the
 * first operation in the system able to break it.
 *
 * <p><strong>The clock is deliberately untouched.</strong> The real TTL is 3 minutes; every assertion
 * here runs inside seconds. So a passing test can only mean the release happened — expiry cannot have
 * rescued it. That is the discriminating-failure property this repo keeps re-learning to demand: delete
 * the {@code releaseHeldBy} call and this class fails, immediately and for the right reason.
 */
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

        // The member takes the lock, and the owner is correctly locked out (ADR-014: no force-take).
        acquire(memberToken, trip).expectStatus().isOk();
        acquire(ownerToken, trip).expectStatus().isEqualTo(409);

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        // No waiting: the lock is free the instant the membership ends.
        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void leavingFreesTheLockTheLeaverWasHolding() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);

        acquire(memberToken, trip).expectStatus().isOk();
        remove(memberToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent(); // leaves

        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void aDepartureLeavesSomebodyElsesLockAlone() {
        // The release is targeted, not a blanket unlock: removing member B must not free the lock the
        // owner is actively holding. The mirror of the test above, and the one that fails if the
        // implementation ever "simplifies" to deleting the itinerary's lease row unconditionally.
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        String bystanderToken = joinAsMember(ownerToken, trip);

        acquire(ownerToken, trip).expectStatus().isOk(); // the OWNER holds the lock

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        // Still locked by the owner — the bystander is refused exactly as before the removal.
        acquire(bystanderToken, trip).expectStatus().isEqualTo(409);
    }

    // --- fixtures ---------------------------------------------------------------------------------

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
