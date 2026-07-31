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
class ItineraryVisibilityIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theOwnerFlipsTheTripPublicAndBackAgain() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");

        publish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("published");
        assertThat(visibilityOf(tripId)).isEqualTo("PUBLISHED");

        unpublish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("private");
        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");
    }


    @Test
    void republishingAfterUnpublishingServesTheSameItineraryId() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
        unpublish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);

        assertThat(visibilityOf(tripId)).isEqualTo("PUBLISHED");
    }


    @Test
    void publishingIsTheOwnersActAndAMemberIsRefusedBothVerbs() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        publish(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");

        publish(owner, tripId).expectStatus().isOk();

        unpublish(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        assertThat(visibilityOf(tripId)).isEqualTo("PUBLISHED");
    }


    @Test
    void aNonMemberIsMaskedOnBothVerbs() {
        String tripId = createItinerary(freshTraveler());
        String stranger = freshTraveler();

        publish(stranger, tripId).expectStatus().isNotFound();
        unpublish(stranger, tripId).expectStatus().isNotFound();
        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");
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
        String tripId = createItinerary(owner);
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
        assertThat(visibilityOf(tripId)).as("the published fact survives underneath the archive").isEqualTo("PUBLISHED");

        unarchive(owner, tripId).expectStatus().isOk();
        unpublish(owner, tripId).expectStatus().isOk();
        assertThat(visibilityOf(tripId)).isEqualTo("PRIVATE");
    }


    @Test
    void anEmptyItineraryPublishesBecauseThereIsNoContentGate() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        publish(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.days.length()").isEqualTo(0);
    }


    @Test
    void publishingIsOrthogonalToTheLifecycleAndLeavesItAlone() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        publish(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.state")
                .isEqualTo("draft")
                .jsonPath("$.visibility")
                .isEqualTo("published");

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/start")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.visibility")
                .isEqualTo("published");
    }


    private RestTestClient.ResponseSpec publish(String token, String itineraryId) {
        return post(token, itineraryId, "publish");
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


    private String visibilityOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT visibility FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
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
