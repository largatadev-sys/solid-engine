package com.largata.itinerary.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * S1.7 ticket 01 over HTTP: the two lifecycle transitions, their full ladders, and the write-once
 * stamps behind them (spec ACs 1, 2, 4).
 *
 * <p>The ladder is asserted in the order the service applies it — <strong>authority before state</strong>
 * (S1.5's rule): a member who is not the owner is refused whether or not the transition would have been
 * legal, so a 403 never depends on, and never leaks, the trip's lifecycle state.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryLifecycleIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    // --- the happy path, both edges (spec AC 1, AC 2) ---------------------------------------------

    @Test
    void theOwnerStartsThenCompletesTheTripAndEachActStampsItsOwnMoment() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        // Born a draft, with neither stamp — the honest state before anything has happened.
        assertThat(stateOf(tripId)).isEqualTo("DRAFT");
        assertThat(stampsOf(tripId)).containsEntry("started_at", null).containsEntry("completed_at", null);

        start(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.state").isEqualTo("active");

        assertThat(stateOf(tripId)).isEqualTo("ACTIVE");
        Map<String, Object> afterStart = stampsOf(tripId);
        assertThat(afterStart.get("started_at")).as("start stamps its own moment").isNotNull();
        assertThat(afterStart.get("completed_at")).as("completion has not happened yet").isNull();

        complete(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.state").isEqualTo("completed");

        assertThat(stateOf(tripId)).isEqualTo("COMPLETED");
        Map<String, Object> afterComplete = stampsOf(tripId);
        assertThat(afterComplete.get("completed_at")).isNotNull();
        assertThat(afterComplete.get("started_at"))
                .as("completing must not disturb the start stamp")
                .isEqualTo(afterStart.get("started_at"));
    }

    @Test
    void theTransitionResponseCarriesTheWholeResourceWithItsPlan() {
        String owner = freshTraveler();
        String tripId = createItineraryWithDays(owner, 3);

        // The client re-renders from this one response rather than transitioning and then refetching,
        // so the plan must ride along exactly as it does on view and edit.
        start(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("active")
                .jsonPath("$.days.length()")
                .isEqualTo(3)
                .jsonPath("$.title")
                .isEqualTo("Draft trip");
    }

    // --- authority (spec AC 1) --------------------------------------------------------------------

    @Test
    void aMemberWhoIsNotTheOwnerCannotStartOrCompleteTheTrip() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        start(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        start(owner, tripId).expectStatus().isOk();

        complete(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        // The member's refusals changed nothing.
        assertThat(stateOf(tripId)).isEqualTo("ACTIVE");
    }

    @Test
    void authorityIsCheckedBeforeState() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        // `complete` on a DRAFT is an illegal transition (409) *and* the caller is a non-owner (403).
        // The 403 must win: were state checked first, the refusal would tell a member without standing
        // exactly where in its lifecycle the trip sits. This test fails if the two checks swap order.
        complete(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    // --- legality (spec AC 1, AC 2) ---------------------------------------------------------------

    @Test
    void startingAnAlreadyActiveOrCompletedTripIsRefused() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        start(owner, tripId).expectStatus().isOk();

        start(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        complete(owner, tripId).expectStatus().isOk();

        start(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }

    @Test
    void completingADraftIsRefusedThereIsNoSkipEdge() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        // Spec decision 9: the forgetful owner whose trip is over but never started reaches `completed`
        // through `active`, in two deliberate acts. A skip edge here would invent a `started_at` they
        // never supplied — or leave it NULL on a completed trip, making "was this ever started?"
        // unanswerable.
        complete(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        assertThat(stateOf(tripId)).isEqualTo("DRAFT");
        assertThat(stampsOf(tripId)).containsEntry("started_at", null).containsEntry("completed_at", null);
    }

    @Test
    void completingAnAlreadyCompletedTripIsRefused() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        start(owner, tripId).expectStatus().isOk();
        complete(owner, tripId).expectStatus().isOk();

        complete(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }

    // --- write-once (spec AC 4) -------------------------------------------------------------------

    @Test
    void arefusedTransitionLeavesTheStampsAndAttributionUntouched() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        start(owner, tripId).expectStatus().isOk();
        complete(owner, tripId).expectStatus().isOk();
        Map<String, Object> stamped = stampsOf(tripId);

        // Every illegal re-attempt, from every direction.
        start(owner, tripId).expectStatus().isEqualTo(409);
        complete(owner, tripId).expectStatus().isEqualTo(409);

        // Forward-only means each transition is reachable from exactly one state and each state is left
        // exactly once — so neither stamp can ever receive a second write. This is that claim, tested.
        assertThat(stampsOf(tripId)).isEqualTo(stamped);
    }

    @Test
    void transitionsDoNotTouchTheLastEditedPair() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        // The pair attributes *plan* edits (S1.3). Starting a trip edits nothing about the plan, so a
        // transition must not claim authorship of an edit that never happened.
        start(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.lastEditedBy")
                .doesNotExist()
                .jsonPath("$.lastEditedAt")
                .doesNotExist();

        complete(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.lastEditedBy")
                .doesNotExist();
    }

    @Test
    void aTransitionNeedsNoEditLeaseEvenWhileAnotherMemberHoldsIt() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        // The member takes the single-writer lock on plan content (S1.4, ADR-014).
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isOk();

        // The owner can still say the trip has begun. A lifecycle transition is a governance act, like
        // S1.5's removal and S1.6's transfer — requiring the lease would mean seizing the editing lock
        // from a member mid-edit just to record that the trip started.
        start(owner, tripId).expectStatus().isOk();
        complete(owner, tripId).expectStatus().isOk();
    }

    // --- guard and visitor (spec AC 1) ------------------------------------------------------------

    @Test
    void aNonMemberIsMaskedWithA404OnBothEndpoints() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String stranger = freshTraveler();

        start(stranger, tripId).expectStatus().isNotFound();
        complete(stranger, tripId).expectStatus().isNotFound();
        assertThat(stateOf(tripId)).isEqualTo("DRAFT");
    }

    @Test
    void aVisitorIsRejectedBeforeAnythingElse() {
        String tripId = createItinerary(freshTraveler());

        rest.post().uri("/v1/itineraries/" + tripId + "/start").exchange().expectStatus().isUnauthorized();
        rest.post().uri("/v1/itineraries/" + tripId + "/complete").exchange().expectStatus().isUnauthorized();
    }

    // --- fixtures ---------------------------------------------------------------------------------

    private RestTestClient.ResponseSpec start(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/start")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec complete(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/complete")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    /**
     * Reads the stored state directly. Deliberately not through the API: the column's spelling is a
     * contract with Hibernate that the wire's lower-case form hides (the V4 lesson).
     */
    private String stateOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
    }

    /** Both lifecycle stamps, straight from the row — they are deliberately not on the wire yet. */
    private Map<String, Object> stampsOf(String itineraryId) {
        return jdbc.queryForMap(
                "SELECT started_at, completed_at FROM itinerary WHERE id = ?", UUID.fromString(itineraryId));
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

    private String createItinerary(String token) {
        return createItineraryWithDays(token, 0);
    }

    private String createItineraryWithDays(String token, int durationDays) {
        String body =
                durationDays == 0
                        ? """
                        {"title":"Draft trip","destinations":["Cebu"]}
                        """
                        : """
                        {"title":"Draft trip","destinations":["Cebu"],"durationDays":%d}
                        """
                                .formatted(durationDays);
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
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
