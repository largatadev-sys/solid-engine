package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
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
 * <strong>The write fence, enumerated</strong> (S1.9 ticket 03, spec ACs 4 and 5) — the test that is
 * the fence's actual guarantee.
 *
 * <p><strong>Why this exists rather than trusting the call sites.</strong> {@code WriteFence} is called
 * explicitly, so no signature forces a future endpoint to consult it — unlike the guard, whose {@link
 * com.largata.common.authz.Membership} parameter makes a forgotten check a compile error. The
 * grilling accepted that residual risk with this test named as the mitigation: it walks <em>every</em>
 * mutating endpoint against an archived trip, so the day somebody adds one without the fence, this
 * fails.
 *
 * <p><strong>It has two outcomes by construction, which is what makes it a check.</strong> Everything
 * refuses <em>except</em> self-removal, which succeeds — the founder's rule at the grilling: acts on the
 * trip freeze, acts on your own membership do not. A fence test where every row returned the same thing
 * could not distinguish "correctly refused" from "endpoint does not exist, so 404" — the
 * indistinguishable-outcomes shape this repo has been burned by three times (S0.6's {@code /gsi/button}
 * watcher, S1.1's deploy probe, V4's nearly-shipped zero-matching index).
 *
 * <p><strong>Every request body here is one the validator accepts</strong>, deliberately — S1.5's
 * comment 5: Spring runs {@code @Valid} during argument resolution, <em>before</em> the controller body,
 * so an incomplete body answers 400 through a path that never consulted the fence at all. A fence test
 * full of 400s would pass while proving nothing.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ArchiveWriteFenceIT extends PostgresTestBase {

    /**
     * A body the validator fully accepts — {@code title} and {@code destinations} are both required on
     * {@code PATCH}. Named as a constant because getting it wrong is the failure mode this class exists
     * to avoid: a 400 from {@code @Valid} is decided during argument resolution, before the controller
     * body and therefore before the fence, so an incomplete body would make every probe pass through a
     * path that never consulted the thing under test (S1.5's comment 5).
     */
    private static final String VALID_ITINERARY_PATCH =
            """
            {"title":"Renamed while frozen","destinations":["Cebu"]}
            """;

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    /**
     * Every act on the trip refuses with {@code TRIP_ARCHIVED} — plan content, lifecycle, the edit
     * lease, invitations, ownership offers, and removing another member.
     *
     * <p>The fixture is built <em>live</em> and archived through the real endpoint, never by planting
     * state: a fence proven against a hand-written {@code ARCHIVED} row would not prove that archiving
     * actually produces the state the fence reads.
     */
    @Test
    void everyActOnAnArchivedTripIsRefused() {
        Trip trip = liveTripWithTwoMembers();
        UUID dayId = firstDayOf(trip.id);
        UUID activityId = createActivity(trip.owner, trip.id, dayId);
        // The owner holds the lease while live, so the plan-write attempts below fail on the fence
        // rather than on the lock — otherwise a TRIP_ARCHIVED assertion could be an EDIT_LOCKED in
        // disguise and the test would pass for the wrong reason.
        acquireLease(trip.owner, trip.id).expectStatus().isOk();

        archive(trip.owner, trip.id).expectStatus().isOk();

        // --- plan content ---
        // The full body, not a partial one: PATCH requires title + destinations, and a short body would
        // answer 400 from @Valid during argument resolution — before the controller, so before the
        // fence. That is S1.5's comment 5, and this line is where this test nearly fell into it.
        refused(patch(trip.owner, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/days", """
                {"title":"A new day"}
                """));
        refused(patch(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId, """
                {"title":"Renamed day"}
                """));
        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities", """
                {"title":"A new activity"}
                """));
        refused(patch(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId,
                """
                {"title":"Renamed activity"}
                """));
        refused(delete(
                trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId));
        refused(put(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/order",
                "{\"activityIds\":[\"" + activityId + "\"]}"));
        refused(post(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId + "/move",
                "{\"targetDayId\":\"" + dayId + "\"}"));

        // --- lifecycle ---
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/start", null));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/complete", null));

        // --- the edit lease ---
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock", null));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock/renew", null));

        // --- invitations and offers (owner-side) ---
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """));
        refused(post(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/ownership-offer",
                "{\"travelerId\":\"" + trip.memberId + "\"}"));
        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/ownership-offer"));

        // --- removing somebody else ---
        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/members/" + trip.memberId));
    }

    /**
     * <strong>The positive control: a member can always leave</strong> (spec decision 4).
     *
     * <p>This is the assertion that gives the class above a failure mode. It is also the rule itself:
     * your relationship to a trip stays yours even when the trip is frozen — and without it a non-owner
     * member of an archived trip would have no act available at all and no way to unarchive, stuck on
     * somebody else's decision.
     */
    @Test
    void aMemberCanStillLeaveAnArchivedTrip() {
        Trip trip = liveTripWithTwoMembers();
        archive(trip.owner, trip.id).expectStatus().isOk();

        delete(trip.member, "/v1/itineraries/" + trip.id + "/members/" + trip.memberId)
                .expectStatus()
                .isNoContent();

        assertThat(membershipCountOn(trip.id)).as("they are genuinely gone, not merely told yes").isEqualTo(1);
    }

    /**
     * The four accept/decline doors are fenced <strong>structurally</strong>, by archive having voided
     * every pending row (ticket 02) — no new check lives in their handlers. This asserts the outcome
     * rather than trusting that reasoning: a pending invitation and a pending offer are created while
     * the trip is live, the trip is archived, and neither can then be accepted.
     */
    @Test
    void acceptAndDeclineAreClosedByVoidingRatherThanByTheFence() {
        Trip trip = liveTripWithTwoMembers();
        post(trip.owner, "/v1/itineraries/" + trip.id + "/ownership-offer", "{\"travelerId\":\"" + trip.memberId + "\"}")
                .expectStatus()
                .isCreated();

        archive(trip.owner, trip.id).expectStatus().isOk();

        // No pending offer survives an archive, so both doors answer "there is nothing here" —
        // OFFER_NOT_FOUND (404), not TRIP_ARCHIVED, and that is correct: the fence never ran because
        // there was nothing left to refuse. The outcome is what matters; asserting the code proves it
        // is this path rather than a coincidental 404 from somewhere else.
        post(trip.member, "/v1/itineraries/" + trip.id + "/ownership-offer/accept", null)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
        post(trip.member, "/v1/itineraries/" + trip.id + "/ownership-offer/decline", null)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
    }

    /**
     * <strong>Authority still runs before the fence</strong>, so {@code TRIP_ARCHIVED} is only ever told
     * to somebody entitled to act: a non-member gets the guard's 404 (learning nothing about the trip,
     * archived or not), and a member attempting an owner-only act gets 403.
     */
    @Test
    void authorityIsAnsweredBeforeTheFence() {
        Trip trip = liveTripWithTwoMembers();
        String stranger = freshTraveler();
        archive(trip.owner, trip.id).expectStatus().isOk();

        patch(stranger, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH)
                .expectStatus()
                .isNotFound();

        post(trip.member, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """)
                .expectStatus()
                .isForbidden();
    }

    /** Unarchiving restores every act — the fence is a state, not a one-way door (spec AC 5). */
    @Test
    void unarchivingRestoresWritesForTheWholeRoster() {
        Trip trip = liveTripWithTwoMembers();
        archive(trip.owner, trip.id).expectStatus().isOk();
        unarchive(trip.owner, trip.id).expectStatus().isOk();

        acquireLease(trip.member, trip.id).expectStatus().isOk();
        patch(trip.member, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH).expectStatus().isOk();
    }

    // --- fixtures ---------------------------------------------------------------------------------

    /** Asserts one refusal — the status and the code, since a 409 alone could be any conflict. */
    private void refused(RestTestClient.ResponseSpec response) {
        response.expectStatus().isEqualTo(409).expectBody().jsonPath("$.code").isEqualTo("TRIP_ARCHIVED");
    }

    private record Trip(String id, String owner, String member, UUID memberId) {}

    private Trip liveTripWithTwoMembers() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        return new Trip(tripId, owner, member, travelerIdOf(member));
    }

    private RestTestClient.ResponseSpec archive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/archive", null);
    }

    private RestTestClient.ResponseSpec unarchive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/unarchive", null);
    }

    private RestTestClient.ResponseSpec acquireLease(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/edit-lock", null);
    }

    private RestTestClient.ResponseSpec post(String token, String uri, String body) {
        return body == null
                ? rest.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange()
                : rest.post()
                        .uri(uri)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .exchange();
    }

    private RestTestClient.ResponseSpec patch(String token, String uri, String body) {
        return rest.method(HttpMethod.PATCH)
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec put(String token, String uri, String body) {
        return rest.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec delete(String token, String uri) {
        return rest.delete().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private UUID firstDayOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? ORDER BY ordinal LIMIT 1",
                UUID.class,
                UUID.fromString(itineraryId));
    }

    private UUID createActivity(String token, String itineraryId, UUID dayId) {
        acquireLease(token, itineraryId).expectStatus().isOk();
        byte[] created =
                post(
                                token,
                                "/v1/itineraries/" + itineraryId + "/days/" + dayId + "/activities",
                                """
                                {"title":"Something to do"}
                                """)
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return UUID.fromString(fieldIn(created, "id"));
    }

    private int membershipCountOn(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM membership m JOIN workspace w ON w.id = m.workspace_id "
                        + "WHERE w.itinerary_id = ?",
                Integer.class,
                UUID.fromString(itineraryId));
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

    /** A trip with one day already seeded, so the plan-write probes have something real to aim at. */
    private String createItinerary(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                        {"title":"Fenceable trip","destinations":["Cebu"],"durationDays":2}
                        """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
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
