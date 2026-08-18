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
                .jsonPath("$.costAmount")
                .isEqualTo("500.00")
                .jsonPath("$.costCurrency")
                .isEqualTo("PHP")
                .jsonPath("$.lastEditedBy")
                .isEqualTo(memberId.toString());
        UUID activityId = activityIdOn(dayId);
        holdActivity(memberToken, tripId, activityId.toString());

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

        rest.method(HttpMethod.DELETE)
                .uri(activitiesUri(tripId, dayId) + "/" + activityId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    @Test
    void aNonMemberIsMaskedOnEveryActivityEndpoint() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
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
    void aHalfEnteredMoneyPairIsA400NotA500_forBothTheCostAndTheBooking() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayId = firstDayId(tripId);

        for (String body :
                new String[] {
                    "{\"title\":\"How much?\",\"costAmount\":\"500\"}",
                    "{\"title\":\"How much?\",\"costCurrency\":\"PHP\"}",
                    "{\"title\":\"How much?\",\"bookingPriceAmount\":\"1800\"}",
                    "{\"title\":\"How much?\",\"bookingPriceCurrency\":\"PHP\"}"
                }) {
            rest.post()
                    .uri(activitiesUri(tripId, dayId))
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .exchange()
                    .expectStatus()
                    .isBadRequest()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void anActivityOfAnotherDayIsNotFound() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayA = firstDayId(tripId);
        String dayBId = appendDay(token, tripId);
        String onB = createActivity(token, tripId, UUID.fromString(dayBId), "On B");

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


    @Test
    void aMemberReordersADayOverHttp() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
        String memberToken = admitMemberTo(tripId);
        String a = createActivity(memberToken, tripId, dayId, "A");
        String b = createActivity(memberToken, tripId, dayId, "B");
        String c = createActivity(memberToken, tripId, dayId, "C");

        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        "{\"expectedActivityIds\":[\""
                                + a
                                + "\",\""
                                + b
                                + "\",\""
                                + c
                                + "\"],\"activityIds\":[\""
                                + c
                                + "\",\""
                                + a
                                + "\",\""
                                + b
                                + "\"]}")
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
    void aReorderListingTheWrongSetIsA400NotAConflict() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayId = firstDayId(tripId);
        String a = createActivity(token, tripId, dayId, "A");
        String b = createActivity(token, tripId, dayId, "B");

        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        "{\"expectedActivityIds\":[\""
                                + a
                                + "\",\""
                                + b
                                + "\"],\"activityIds\":[\""
                                + a
                                + "\"]}")
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_REORDER");
    }

    @Test
    void aMemberMovesAnActivityToAnotherDay() {
        String token = freshTraveler();
        String tripId = createTripWithADay(token);
        UUID dayA = firstDayId(tripId);
        String dayBId = appendDay(token, tripId);
        String moving = createActivity(token, tripId, dayA, "Moving");
        holdActivity(token, tripId, moving);

        rest.post()
                .uri(activitiesUri(tripId, dayA) + "/" + moving + "/move")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"targetDayId\":\"" + dayBId + "\"}")
                .exchange()
                .expectStatus()
                .isOk();

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
        UUID dayId = firstDayId(tripId);
        String activityId = createActivity(ownerToken, tripId, dayId, "Mine");
        String dayBId = appendDay(ownerToken, tripId);
        String stranger = freshTraveler();

        rest.put()
                .uri(activitiesUri(tripId, dayId) + "/order")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        "{\"expectedActivityIds\":[\""
                                + activityId
                                + "\"],\"activityIds\":[\""
                                + activityId
                                + "\"]}")
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


    private static String activitiesUri(String tripId, UUID dayId) {
        return "/v1/itineraries/" + tripId + "/days/" + dayId + "/activities";
    }

    private String createActivity(String token, String tripId, UUID dayId, String title) {
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


    private void holdActivity(String token, String tripId, String activityId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"subjectType\":\"activity\",\"subjectId\":\"" + activityId + "\"}")
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
