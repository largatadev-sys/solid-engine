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
 * Ticket 02's ACs over HTTP: activity CRUD, attribution, cost as a wire string, and the guard's
 * masking on every activity endpoint (spec AC 4/6/7, §fields).
 *
 * <p><strong>The S1.3 last-write-wins test is gone, reversed by S1.4 (ADR-014).</strong> It used to
 * prove that two members editing the same activity in sequence resolved by silent overwrite — "no 409,
 * no conflict surface anywhere". S1.4 replaces that whole posture with the single-writer edit lock: a
 * second member cannot write while the first holds the lease. The reversal is deliberate and visible
 * in the diff; the enforcement it replaces the LWW proof with lives in {@code EditLockEnforcementIT},
 * and the writes here now take the lock first (see {@link #lock}).
 *
 * <p>The member fixture matches {@code DayContractIT}: a second traveler is admitted directly as a
 * {@code MEMBER} (the state a real S1.2 accept produces), so these tests exercise the day/activity
 * endpoints under a real non-owner membership without dragging in the invitation flow.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ActivityContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aMemberCreatesEditsAndDeletesAnActivityWithAttribution() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
        String memberToken = admitMemberTo(tripId);
        UUID memberId = travelerIdOf(memberToken);
        lock(memberToken, tripId); // S1.4: the member holds the edit lock before writing

        // Create, as the member — cost carried as a wire string, time as ISO local.
        rest.post()
                .uri(activitiesUri(tripId, dayId))
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        """
                        {"title":"Airport Transfer","timeOfDay":"14:00","costAmount":"500.00",
                         "costCurrency":"PHP","place":"Lio Airport","description":"Van to hotel.",
                         "notes":"Book 8am.","externalUrl":"https://klook.com/x"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Airport Transfer")
                .jsonPath("$.timeOfDay")
                .isEqualTo("14:00")
                // The headline of the costAmount fix: a STRING on the wire, not a JSON number.
                .jsonPath("$.costAmount")
                .isEqualTo("500.00")
                .jsonPath("$.costCurrency")
                .isEqualTo("PHP")
                .jsonPath("$.lastEditedBy")
                .isEqualTo(memberId.toString());
        UUID activityId = activityIdOn(dayId);

        // Edit, as the member — whole-entity replace; the omitted fields clear.
        rest.patch()
                .uri(activitiesUri(tripId, dayId) + "/" + activityId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Airport pickup"}
                        """)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Airport pickup")
                .jsonPath("$.costAmount")
                .doesNotExist();

        // Delete, as the member.
        rest.method(HttpMethod.DELETE)
                .uri(activitiesUri(tripId, dayId) + "/" + activityId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isNoContent();
    }

    // The S1.3 two-member last-write-wins test was here. S1.4 (ADR-014) reversed the posture it
    // pinned — a second member can no longer write while the first holds the edit lock — so it is
    // deleted rather than adapted, and EditLockEnforcementIT proves the replacement behaviour. The
    // deletion is intentional and named in the S1.4 PR (spec ticket 02 AC 6).

    @Test
    void aNonMemberIsMaskedOnEveryActivityEndpoint() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
        lock(ownerToken, tripId); // S1.4: the owner holds the lock for the setup write below
        String activityId = createActivity(ownerToken, tripId, dayId, "Private");
        String stranger = freshTraveler();

        rest.post()
                .uri(activitiesUri(tripId, dayId))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x"}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.patch()
                .uri(activitiesUri(tripId, dayId) + "/" + activityId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x"}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.method(HttpMethod.DELETE)
                .uri(activitiesUri(tripId, dayId) + "/" + activityId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void aVisitorWithNoTokenIsRejectedAtTheSecurityChain() {
        rest.post()
                .uri("/v1/itineraries/" + UUID.randomUUID() + "/days/" + UUID.randomUUID() + "/activities")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x"}
                        """)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void aBlankTitleIsRejectedAsABadRequest() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayId = firstDayId(tripId);

        rest.post()
                .uri(activitiesUri(tripId, dayId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"   "}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void aMalformedTimeIsA400NotA500() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayId = firstDayId(tripId);

        // "banana" is not a time — the @Pattern catches it at the DTO door as a 400, never a 500 in
        // the parser (the trap this DTO's javadoc records).
        rest.post()
                .uri(activitiesUri(tripId, dayId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"When?","timeOfDay":"banana"}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void anActivityOfAnotherDayIsNotFound() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        lock(token, tripId); // S1.4: hold the lock for the day/activity writes below
        UUID dayA = firstDayId(tripId);
        // A second day, and an activity on it.
        String dayBId = appendDay(token, tripId);
        String onB = createActivity(token, tripId, UUID.fromString(dayBId), "On B");

        // Address B's activity under day A → masking 404.
        rest.patch()
                .uri(activitiesUri(tripId, dayA) + "/" + onB)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x"}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ACTIVITY_NOT_FOUND");
    }

    // --- ticket 03: reorder + move ----------------------------------------------------------------

    @Test
    void aMemberReordersADayOverHttp() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
        String memberToken = admitMemberTo(tripId);
        lock(memberToken, tripId); // S1.4: the member holds the lock for the creates + reorder
        String a = createActivity(memberToken, tripId, dayId, "A");
        String b = createActivity(memberToken, tripId, dayId, "B");
        String c = createActivity(memberToken, tripId, dayId, "C");

        // Member drags C to the top — the whole new order goes in the PUT body. The PUT returns the
        // reordered day (200 + resource), so the confirmed order is right there in the response.
        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"activityIds\":[\"" + c + "\",\"" + a + "\",\"" + b + "\"]}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.activities[0].id")
                .isEqualTo(c)
                .jsonPath("$.activities[1].id")
                .isEqualTo(a)
                .jsonPath("$.activities[2].id")
                .isEqualTo(b);

        // ...and a fresh plan read confirms it persisted, not just echoed.
        rest.get()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectBody()
                .jsonPath("$.days[0].activities[0].id")
                .isEqualTo(c)
                .jsonPath("$.days[0].activities[1].id")
                .isEqualTo(a)
                .jsonPath("$.days[0].activities[2].id")
                .isEqualTo(b);
    }

    @Test
    void aStaleReorderListIsA400() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        lock(token, tripId); // S1.4: hold the lock for the creates + reorder attempt
        UUID dayId = firstDayId(tripId);
        String a = createActivity(token, tripId, dayId, "A");
        createActivity(token, tripId, dayId, "B");

        // A list one activity short — a stale client. The set-equality guard makes it a 400, not a
        // silent drop of B (spec AC 3 note).
        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"activityIds\":[\"" + a + "\"]}")
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void aMemberMovesAnActivityToAnotherDay() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        lock(token, tripId); // S1.4: hold the lock for the day/activity writes + move
        UUID dayA = firstDayId(tripId);
        String dayBId = appendDay(token, tripId);
        String moving = createActivity(token, tripId, dayA, "Moving");

        rest.post()
                .uri(activitiesUri(tripId, dayA) + "/" + moving + "/move")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"targetDayId\":\"" + dayBId + "\"}")
                .exchange()
                .expectStatus()
                .isOk();

        // Day A is empty; the activity is now on Day B.
        rest.get()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectBody()
                .jsonPath("$.days[0].activities.length()")
                .isEqualTo(0)
                .jsonPath("$.days[1].activities[0].id")
                .isEqualTo(moving);
    }

    @Test
    void aNonMemberCannotReorderOrMove() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        lock(ownerToken, tripId); // S1.4: the owner holds the lock for the setup writes below
        UUID dayId = firstDayId(tripId);
        String activityId = createActivity(ownerToken, tripId, dayId, "Mine");
        String dayBId = appendDay(ownerToken, tripId);
        String stranger = freshTraveler();

        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"activityIds\":[\"" + activityId + "\"]}")
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.post()
                .uri(activitiesUri(tripId, dayId) + "/" + activityId + "/move")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"targetDayId\":\"" + dayBId + "\"}")
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    // --- fixtures ---------------------------------------------------------------------------------

    private static String activitiesUri(String tripId, UUID dayId) {
        return "/v1/itineraries/" + tripId + "/days/" + dayId + "/activities";
    }

    private String createActivity(String token, String tripId, UUID dayId, String title) {
        // The id comes from the create response, not a by-day query — a day may hold many activities
        // (ticket 03's reorder tests create several), so "the activity on this day" is not unique.
        byte[] created =
                rest.post()
                        .uri(activitiesUri(tripId, dayId))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"" + title + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    /**
     * Acquires the edit lock as {@code token} (S1.4, ADR-014): activity writes now require the lease.
     * Called by every write test as the traveler who will write. Guard-masking tests lock as the owner
     * for their setup writes; the stranger's attempts 404 before the lock, so their assertions are
     * unchanged. Enforcement (a write without the lock is refused) is proven in {@code
     * EditLockEnforcementIT}.
     */
    private void lock(String token, String tripId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createTripWithADay(String token) {
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

    private String appendDay(String token, String tripId) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/days")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
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

    /** Provisions (or fetches) the traveler behind a token by calling /me, and returns their id. */
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

    private UUID firstDayId(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                UUID.class,
                UUID.fromString(itineraryId));
    }

    /** The single activity on a day — the tests that use this create exactly one. */
    private UUID activityIdOn(UUID dayId) {
        return jdbc.queryForObject("SELECT id FROM activity WHERE day_id = ?", UUID.class, dayId);
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
