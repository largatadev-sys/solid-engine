package com.largata.itinerary.web;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryFieldEditIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aMemberWhoIsNotTheOwnerEditsEveryFieldAndIsRecordedAsTheEditor() {
        String ownerToken = freshTraveler();
        String tripId =
                createItinerary(
                        ownerToken, """
                        {"title":"Draft trip","destinations":["Cebu"]}
                        """);
        String memberToken = admitMemberTo(tripId);
        UUID memberId = travelerIdOf(memberToken);
        lock(memberToken, tripId);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        """
                        {"title":"El Nido 2027","destinations":["Palawan","El Nido"],
                         "description":"Island hopping.","startDate":"2027-01-10","endDate":"2027-01-20"}
                        """)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("El Nido 2027")
                .jsonPath("$.destinations")
                .isEqualTo(List.of("Palawan", "El Nido"))
                .jsonPath("$.description")
                .isEqualTo("Island hopping.")
                .jsonPath("$.startDate")
                .isEqualTo("2027-01-10")
                .jsonPath("$.endDate")
                .isEqualTo("2027-01-20")
                .jsonPath("$.lastEditedBy")
                .isEqualTo(memberId.toString())
                .jsonPath("$.lastEditedAt")
                .exists();
    }

    @Test
    void anOmittedDescriptionClearsIt() {
        String token = freshTraveler();
        String tripId =
                createItinerary(
                        token,
                        """
                        {"title":"Trip","destinations":["Cebu"],"description":"Old blurb."}
                        """);
        lock(token, tripId);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Trip","destinations":["Cebu"]}
                        """)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.description")
                .doesNotExist();
    }

    @Test
    void thePlanSurvivesAFieldEdit() {
        String token = freshTraveler();
        String tripId =
                createItinerary(
                        token,
                        """
                        {"title":"Trip","destinations":["Cebu"],"durationDays":3}
                        """);
        lock(token, tripId);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Renamed","destinations":["Cebu"]}
                        """)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(3);
    }

    @Test
    void aBackwardsDateRangeIsRejected() {
        String token = freshTraveler();
        String tripId = createItinerary(token, """
                {"title":"Trip","destinations":["Cebu"]}
                """);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        """
                        {"title":"Trip","destinations":["Cebu"],"startDate":"2027-06-10","endDate":"2027-06-03"}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .exists();
    }

    @Test
    void aBlankTitleOnEditIsRejected() {
        String token = freshTraveler();
        String tripId = createItinerary(token, """
                {"title":"Trip","destinations":["Cebu"]}
                """);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"   ","destinations":["Cebu"]}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void anEmptyDestinationsListOnEditIsRejected() {
        String token = freshTraveler();
        String tripId = createItinerary(token, """
                {"title":"Trip","destinations":["Cebu"]}
                """);

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Trip","destinations":[]}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void aNonMemberEditingIsMasked() {
        String ownerToken = freshTraveler();
        String tripId = createItinerary(ownerToken, """
                {"title":"Private","destinations":["Kyoto"]}
                """);
        String stranger = freshTraveler();

        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Hijacked","destinations":["Kyoto"]}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }

    @Test
    void aVisitorWithNoTokenIsRejected() {
        rest.patch()
                .uri("/v1/itineraries/" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x","destinations":["y"]}
                        """)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }



    private void lock(String token, String itineraryId) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
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

    private String createItinerary(String token, String body) {
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
