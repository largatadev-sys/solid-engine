package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryPublicationIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void publishingDefaultsToPublicAndUnpublishingLeavesTheTripCompleted() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        assertThat(publishedFlagOf(tripId)).isFalse();

        publish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.published")
                .isEqualTo(true)
                .jsonPath("$.visibility")
                .isEqualTo("public");
        assertThat(visibilityOf(tripId)).as("the default audience is public").isEqualTo("PUBLIC");

        unpublish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.state")
                .isEqualTo("completed");
        assertThat(stateOf(tripId))
                .as("withdrawing from the feed does not un-travel the trip")
                .isEqualTo("COMPLETED");
    }


    @Test
    void onlyACompletedTripCanBePublished() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        publish(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_COMPLETE");
        assertThat(publishedFlagOf(tripId)).isFalse();

        post(owner, tripId, "start").expectStatus().isOk();
        publish(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_COMPLETE");

        post(owner, tripId, "complete").expectStatus().isOk();
        publish(owner, tripId).expectStatus().isOk();
        assertThat(publishedFlagOf(tripId)).isTrue();
    }


    @Test
    void theAudienceMovesWithoutLeavingTheFeed() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        publishTo(owner, tripId, "private")
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("private")
                .jsonPath("$.published")
                .isEqualTo(true);
        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");

        audience(owner, tripId, "public").expectStatus().isOk();
        assertThat(visibilityOf(tripId)).as("public ⇄ private is a toggle, not a republish").isEqualTo("PUBLIC");
        assertThat(publishedFlagOf(tripId)).as("…and it never leaves the feed").isTrue();
    }


    @Test
    void theAudienceIsSettableBeforePublishing_becauseItIsNotAPublicationFact() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        audience(owner, tripId, "private")
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("private")
                .jsonPath("$.published")
                .isEqualTo(false);
    }


    @Test
    void aLifecycleStateIsNotAnAudienceYouCanPublishTo() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        publishTo(owner, tripId, "draft")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNKNOWN_AUDIENCE");
        assertThat(publishedFlagOf(tripId)).isFalse();
    }


    @Test
    void aPublishedTripPinsItsLifecycleUntilItIsUnpublished() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);
        publish(owner, tripId).expectStatus().isOk();

        post(owner, tripId, "reopen")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
        assertThat(stateOf(tripId)).isEqualTo("COMPLETED");

        unpublish(owner, tripId).expectStatus().isOk();
        post(owner, tripId, "reopen").expectStatus().isOk().expectBody().jsonPath("$.state").isEqualTo("active");
    }


    @Test
    void reopenStepsBackOneStateAtATime() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        post(owner, tripId, "reopen").expectStatus().isOk();
        assertThat(stateOf(tripId)).isEqualTo("ACTIVE");

        post(owner, tripId, "reopen").expectStatus().isOk();
        assertThat(stateOf(tripId)).isEqualTo("DRAFT");

        post(owner, tripId, "reopen")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }


    @Test
    void aPublishedPlanIsFrozen_andUnpublishingThawsIt() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        addDay(owner, tripId).expectStatus().isCreated();

        post(owner, tripId, "start").expectStatus().isOk();
        post(owner, tripId, "complete").expectStatus().isOk();
        publish(owner, tripId).expectStatus().isOk();

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_PUBLISHED");

        addDay(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_PUBLISHED");

        unpublish(owner, tripId).expectStatus().isOk();

        addDay(owner, tripId).expectStatus().isCreated();
    }


    private RestTestClient.ResponseSpec addDay(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange();
    }


    @Test
    void republishingAfterUnpublishingServesTheSameItineraryId() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
        unpublish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);

        assertThat(publishedFlagOf(tripId)).isTrue();
    }


    @Test
    void publishingIsTheOwnersActAndAMemberIsRefusedBothVerbs() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);
        String member = admitMemberTo(tripId);

        publish(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        assertThat(publishedFlagOf(tripId)).isFalse();

        publish(owner, tripId).expectStatus().isOk();

        unpublish(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        assertThat(publishedFlagOf(tripId)).isTrue();
    }


    @Test
    void aNonMemberIsMaskedOnBothVerbs() {
        String tripId = completedTrip(freshTraveler());
        String stranger = freshTraveler();

        publish(stranger, tripId).expectStatus().isNotFound();
        unpublish(stranger, tripId).expectStatus().isNotFound();
        assertThat(publishedFlagOf(tripId)).isFalse();
    }


    @Test
    void aVisitorIsRejectedBeforeAnythingElse() {
        String tripId = createItinerary(freshTraveler());

        rest.post().uri("/v1/itineraries/" + tripId + "/publish").exchange().expectStatus().isUnauthorized();
        rest.post().uri("/v1/itineraries/" + tripId + "/unpublish").exchange().expectStatus().isUnauthorized();
    }


    @Test
    void bothVerbsAreActsOnTheTripSoTheArchiveFenceRejectsThem() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);
        publish(owner, tripId).expectStatus().isOk();
        archive(owner, tripId).expectStatus().isOk();

        unpublish(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_ARCHIVED");
        publish(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_ARCHIVED");
        assertThat(publishedFlagOf(tripId)).as("the published fact survives underneath the archive").isTrue();

        unarchive(owner, tripId).expectStatus().isOk();
        unpublish(owner, tripId).expectStatus().isOk();
        assertThat(publishedFlagOf(tripId)).isFalse();
    }


    @Test
    void anEmptyItineraryPublishesBecauseThereIsNoContentGate() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.days.length()").isEqualTo(0);
    }


    @Test
    void theThreeAxesAreIndependentFactsOnTheWire() {
        String owner = freshTraveler();
        String tripId = completedTrip(owner);

        publish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("completed")
                .jsonPath("$.published")
                .isEqualTo(true)
                .jsonPath("$.visibility")
                .isEqualTo("public");

        audience(owner, tripId, "private")
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("completed")
                .jsonPath("$.published")
                .isEqualTo(true)
                .jsonPath("$.visibility")
                .isEqualTo("private");

        assertThat(stateOf(tripId)).as("moving the audience touches neither of the other two axes").isEqualTo("COMPLETED");
        assertThat(publishedFlagOf(tripId)).isTrue();
    }


    private RestTestClient.ResponseSpec publish(String token, String itineraryId) {
        return post(token, itineraryId, "publish");
    }

    private RestTestClient.ResponseSpec publishTo(String token, String itineraryId, String audience) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/publish")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"" + audience + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec audience(String token, String itineraryId, String audience) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/audience")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"" + audience + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec unpublish(String token, String itineraryId) {
        return post(token, itineraryId, "unpublish");
    }

    private RestTestClient.ResponseSpec archive(String token, String itineraryId) {
        return post(token, itineraryId, "archive");
    }

    private RestTestClient.ResponseSpec unarchive(String token, String itineraryId) {
        return post(token, itineraryId, "unarchive");
    }

    private RestTestClient.ResponseSpec post(String token, String itineraryId, String act) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + act)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }


    private boolean publishedFlagOf(String itineraryId) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT published FROM itinerary WHERE id = ?", Boolean.class, UUID.fromString(itineraryId)));
    }

    private String visibilityOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT visibility FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
    }

    private String stateOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
    }

    private String completedTrip(String token) {
        String itineraryId = createItinerary(token);
        post(token, itineraryId, "start").expectStatus().isOk();
        post(token, itineraryId, "complete").expectStatus().isOk();
        return itineraryId;
    }

    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                travelerIdOf(memberToken),
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
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Island Hopping in El Nido","destinations":["Palawan"]}
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
