package com.largata.support;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


public final class TripRig {

    private final RestTestClient rest;
    private final JdbcTemplate jdbc;

    public TripRig(RestTestClient rest, JdbcTemplate jdbc) {
        this.rest = rest;
        this.jdbc = jdbc;
    }


    public String travelerWithHandle(String handle) {
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    public String createTrip(String ownerToken, int durationDays) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(
                                "{\"title\":\"Trip\",\"destinations\":[\"Palawan\"],\"durationDays\":"
                                        + durationDays
                                        + "}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }


    public String joinAsMember(String ownerToken, String tripId, String handle) {
        String uid = "uid-" + UUID.randomUUID();
        String email = uid + "@example.com";
        byte[] invitation =
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
        String memberToken = TestJwtSupport.verifiedToken(uid, email);
        rest.post()
                .uri("/v1/invitations/" + fieldIn(invitation, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk();
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
        return memberToken;
    }


    public UUID travelerIdOf(String token) {
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


    public UUID dayAt(String tripId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = ?",
                UUID.class,
                UUID.fromString(tripId),
                ordinal);
    }


    public UUID addActivity(String token, String tripId, UUID dayId, String title) {
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
        return UUID.fromString(fieldIn(created, "id"));
    }


    public RestTestClient.ResponseSpec acquire(String token, String tripId, String subjectType, UUID subjectId) {
        return rest.post()
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(subjectBody(subjectType, subjectId))
                .exchange();
    }


    public void hold(String token, String tripId, String subjectType, UUID subjectId) {
        acquire(token, tripId, subjectType, subjectId).expectStatus().isOk();
    }


    public RestTestClient.ResponseSpec releaseLease(
            String token, String tripId, String subjectType, UUID subjectId) {
        return rest.method(HttpMethod.DELETE)
                .uri(lockUri(tripId))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(subjectBody(subjectType, subjectId))
                .exchange();
    }


    public RestTestClient.ResponseSpec send(HttpMethod method, String uri, String token, String body) {
        var request = rest.method(method).uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token));
        return body == null
                ? request.exchange()
                : request.contentType(MediaType.APPLICATION_JSON).body(body).exchange();
    }


    public List<String> historyActs(String tripId) {
        return jdbc.queryForList(
                "SELECT act FROM activity_history WHERE itinerary_id = ? ORDER BY id",
                String.class,
                UUID.fromString(tripId));
    }


    public byte[] readTrip(String token, String tripId) {
        return rest.get()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    public long planVersionOf(String token, String tripId) {
        return Long.parseLong(numberIn(readTrip(token, tripId), "planVersion"));
    }


    public static String activitiesUri(String tripId, UUID dayId) {
        return "/v1/itineraries/" + tripId + "/days/" + dayId + "/activities";
    }


    public static String lockUri(String tripId) {
        return "/v1/itineraries/" + tripId + "/edit-lock";
    }


    public static String bearer(String token) {
        return "Bearer " + token;
    }


    public static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }


    public static String numberIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":";
        int start = json.indexOf(needle) + needle.length();
        int end = start;
        while (end < json.length() && "-0123456789.".indexOf(json.charAt(end)) >= 0) {
            end++;
        }
        return json.substring(start, end);
    }


    private static String subjectBody(String subjectType, UUID subjectId) {
        return subjectId == null
                ? "{\"subjectType\":\"" + subjectType + "\"}"
                : "{\"subjectType\":\"" + subjectType + "\",\"subjectId\":\"" + subjectId + "\"}";
    }
}
