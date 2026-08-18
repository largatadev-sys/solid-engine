package com.largata.membership;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
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
class DepartureFreesEditLockIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void removingTheLockHolderFreesThePlanImmediately() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);

        acquire(memberToken, trip).expectStatus().isOk();
        acquire(ownerToken, trip).expectStatus().isEqualTo(409);

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void leavingFreesTheLockTheLeaverWasHolding() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);

        acquire(memberToken, trip).expectStatus().isOk();
        remove(memberToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(ownerToken, trip).expectStatus().isOk();
    }

    @Test
    void aDepartureFreesEverySubjectTheLeaverWasHolding() {
        String ownerToken = verified();
        String trip = createTripWithADay(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID dayId = firstDayId(trip);
        UUID activityId = createActivity(memberToken, trip, dayId);

        acquireOn(memberToken, trip, "day", dayId).expectStatus().isOk();
        acquireOn(memberToken, trip, "activity", activityId).expectStatus().isOk();
        acquireOn(ownerToken, trip, "day", dayId).expectStatus().isEqualTo(409);

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquireOn(ownerToken, trip, "day", dayId).expectStatus().isOk();
        acquireOn(ownerToken, trip, "activity", activityId).expectStatus().isOk();
    }

    @Test
    void aDepartureLeavesSomebodyElsesLockAlone() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        String bystanderToken = joinAsMember(ownerToken, trip);

        acquire(ownerToken, trip).expectStatus().isOk();

        remove(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        acquire(bystanderToken, trip).expectStatus().isEqualTo(409);
    }


    private RestTestClient.ResponseSpec acquireOn(
            String token, String tripId, String subjectType, UUID subjectId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"subjectType\":\"" + subjectType + "\",\"subjectId\":\"" + subjectId + "\"}")
                .exchange();
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

    private UUID firstDayId(String tripId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                UUID.class,
                UUID.fromString(tripId));
    }

    private UUID createActivity(String token, String tripId, UUID dayId) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/days/" + dayId + "/activities")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"Mid-edit\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return UUID.fromString(fieldIn(created, "id"));
    }

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
                                {"title":"Trip","destination":"Palawan"}
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
