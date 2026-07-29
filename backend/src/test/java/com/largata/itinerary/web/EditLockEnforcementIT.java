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
class EditLockEnforcementIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void everyPlanWriteFamilyIsRefusedWithoutTheLockAndSucceedsWithIt() {
        String ownerToken = freshTraveler();
        String tripId = createTripWithADay(ownerToken);
        UUID dayId = firstDayId(tripId);
        String blockerToken = admitMemberTo(tripId);

        lock(blockerToken, tripId);

        assertLockedWrite(HttpMethod.PATCH, "/v1/itineraries/" + tripId, ownerToken,
                "{\"title\":\"x\",\"destinations\":[\"y\"]}");
        assertLockedWrite(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", ownerToken, "{}");
        assertLockedWrite(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayId, ownerToken,
                "{\"title\":\"x\"}");
        assertLockedWrite(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayId, ownerToken, null);
        assertLockedWrite(HttpMethod.POST, activitiesUri(tripId, dayId), ownerToken, "{\"title\":\"x\"}");
        UUID someActivity = UUID.randomUUID();
        assertLockedWrite(HttpMethod.PATCH, activitiesUri(tripId, dayId) + "/" + someActivity, ownerToken,
                "{\"title\":\"x\"}");
        assertLockedWrite(HttpMethod.DELETE, activitiesUri(tripId, dayId) + "/" + someActivity, ownerToken, null);
        assertLockedWrite(HttpMethod.PUT, activitiesUri(tripId, dayId) + "/order", ownerToken,
                "{\"activityIds\":[]}");
        assertLockedWrite(HttpMethod.POST, activitiesUri(tripId, dayId) + "/" + someActivity + "/move", ownerToken,
                "{\"targetDayId\":\"" + UUID.randomUUID() + "\"}");

        release(blockerToken, tripId);
        lock(ownerToken, tripId);
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void assertLockedWrite(HttpMethod method, String uri, String token, String body) {
        var headers = rest.method(method).uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token));
        var response =
                body != null
                        ? headers.contentType(MediaType.APPLICATION_JSON).body(body).exchange()
                        : headers.exchange();
        response.expectStatus().isEqualTo(409).expectBody().jsonPath("$.code").isEqualTo("EDIT_LOCKED");
    }


    private static String activitiesUri(String tripId, UUID dayId) {
        return "/v1/itineraries/" + tripId + "/days/" + dayId + "/activities";
    }

    private void lock(String token, String tripId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void release(String token, String tripId) {
        rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
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
