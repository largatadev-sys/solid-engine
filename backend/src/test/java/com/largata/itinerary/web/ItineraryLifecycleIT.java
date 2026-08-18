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


    @Test
    void theOwnerWalksTheWholeLadderAndEachTravelActStampsItsOwnMoment() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        assertThat(stateOf(tripId)).isEqualTo("DRAFT");
        assertThat(stampsOf(tripId)).containsEntry("started_at", null).containsEntry("completed_at", null);

        finishPlanning(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.state").isEqualTo("upcoming");

        assertThat(stateOf(tripId)).isEqualTo("UPCOMING");
        assertThat(stampsOf(tripId))
                .as("finishing planning is not a travel act — it stamps nothing")
                .containsEntry("started_at", null)
                .containsEntry("completed_at", null);

        start(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.state").isEqualTo("ongoing");

        assertThat(stateOf(tripId)).isEqualTo("ONGOING");
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

        finishPlanning(owner, tripId).expectStatus().isOk();
        start(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("ongoing")
                .jsonPath("$.days.length()")
                .isEqualTo(3)
                .jsonPath("$.title")
                .isEqualTo("Draft trip");
    }


    @Test
    void aMemberWhoIsNotTheOwnerCannotMoveTheTripAlongAtAnyRung() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        finishPlanning(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        finishPlanning(owner, tripId).expectStatus().isOk();

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

        assertThat(stateOf(tripId)).isEqualTo("ONGOING");
    }

    @Test
    void authorityIsCheckedBeforeState() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        complete(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void startingATripThatIsNotWaitingToSetOffIsRefused() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        start(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        walkToOngoing(owner, tripId);

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
    void everyJumpUpTheLadderIsRefusedThereAreNoSkipEdges() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        complete(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        assertThat(stateOf(tripId)).isEqualTo("DRAFT");
        assertThat(stampsOf(tripId)).containsEntry("started_at", null).containsEntry("completed_at", null);

        finishPlanning(owner, tripId).expectStatus().isOk();

        complete(owner, tripId).expectStatus().isEqualTo(409);

        assertThat(stateOf(tripId))
                .as("upcoming → completed skips the trip itself, so nothing moved")
                .isEqualTo("UPCOMING");
    }

    @Test
    void repeatingAnActThatHasAlreadyHappenedIsRefused() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        finishPlanning(owner, tripId).expectStatus().isOk();

        finishPlanning(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        start(owner, tripId).expectStatus().isOk();
        complete(owner, tripId).expectStatus().isOk();

        complete(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }


    @Test
    void arefusedTransitionLeavesTheStampsAndAttributionUntouched() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        walkToCompleted(owner, tripId);
        Map<String, Object> stamped = stampsOf(tripId);

        finishPlanning(owner, tripId).expectStatus().isEqualTo(409);
        start(owner, tripId).expectStatus().isEqualTo(409);
        complete(owner, tripId).expectStatus().isEqualTo(409);

        assertThat(stampsOf(tripId)).isEqualTo(stamped);
    }

    @Test
    void transitionsDoNotTouchTheLastEditedPair() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Edited by the owner","destination":"Cebu"}
                        """)
                .exchange()
                .expectStatus()
                .isOk();
        Map<String, Object> afterEdit = attributionOf(tripId);
        assertThat(afterEdit.get("last_edited_by")).isEqualTo(travelerIdOf(owner));

        finishPlanning(owner, tripId).expectStatus().isOk();
        assertThat(attributionOf(tripId)).isEqualTo(afterEdit);

        start(owner, tripId).expectStatus().isOk();
        assertThat(attributionOf(tripId)).isEqualTo(afterEdit);

        complete(owner, tripId).expectStatus().isOk();
        assertThat(attributionOf(tripId))
                .as("no transition may overwrite the recorded editor attribution")
                .isEqualTo(afterEdit);
    }

    @Test
    void aTransitionNeedsNoEditLeaseEvenWhileAnotherMemberHoldsIt() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isOk();

        walkToCompleted(owner, tripId);
    }


    @Test
    void aNonMemberIsMaskedWithA404OnEveryTransitionEndpoint() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String stranger = freshTraveler();

        finishPlanning(stranger, tripId).expectStatus().isNotFound();
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


    private void walkToOngoing(String token, String itineraryId) {
        finishPlanning(token, itineraryId).expectStatus().isOk();
        start(token, itineraryId).expectStatus().isOk();
    }

    private void walkToCompleted(String token, String itineraryId) {
        walkToOngoing(token, itineraryId);
        complete(token, itineraryId).expectStatus().isOk();
    }

    private RestTestClient.ResponseSpec finishPlanning(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/finish-planning")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

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


    private String stateOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
    }


    private Map<String, Object> stampsOf(String itineraryId) {
        return jdbc.queryForMap(
                "SELECT started_at, completed_at FROM itinerary WHERE id = ?", UUID.fromString(itineraryId));
    }


    private Map<String, Object> attributionOf(String itineraryId) {
        return jdbc.queryForMap(
                "SELECT last_edited_by, last_edited_at FROM itinerary WHERE id = ?", UUID.fromString(itineraryId));
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
                        {"title":"Draft trip","destination":"Cebu"}
                        """
                        : """
                        {"title":"Draft trip","destination":"Cebu","durationDays":%d}
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
