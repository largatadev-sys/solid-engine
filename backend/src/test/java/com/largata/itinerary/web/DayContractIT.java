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
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DayContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @org.springframework.boot.test.web.server.LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theCreateResponseItselfCarriesTheSeededDays() {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"El Nido","destinations":["Palawan"],"durationDays":3}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(3)
                .jsonPath("$.days[0].ordinal")
                .isEqualTo(1)
                .jsonPath("$.days[2].ordinal")
                .isEqualTo(3);
    }

    @Test
    void creatingWithADurationReturnsAndEmbedsTheDays() {
        String token = freshTraveler();

        String id =
                createItinerary(
                        token,
                        """
                        {"title":"El Nido","destinations":["Palawan"],"durationDays":5}
                        """);

        rest.get()
                .uri("/v1/itineraries/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(5)
                .jsonPath("$.days[0].ordinal")
                .isEqualTo(1)
                .jsonPath("$.days[4].ordinal")
                .isEqualTo(5)
                .jsonPath("$.days[0].activities.length()")
                .isEqualTo(0)
                .jsonPath("$.description")
                .doesNotExist();
    }

    @Test
    void creatingWithADescriptionRoundTripsIt() {
        String token = freshTraveler();
        String id =
                createItinerary(
                        token,
                        """
                        {"title":"El Nido","destinations":["Palawan"],"description":"Island hopping."}
                        """);

        rest.get()
                .uri("/v1/itineraries/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.description")
                .isEqualTo("Island hopping.");
    }

    @Test
    void creatingWithoutADurationIsAValidZeroDayPlan() {
        String token = freshTraveler();
        String id = createItinerary(token, """
                {"title":"Japan, someday","destinations":["Japan"]}
                """);

        rest.get()
                .uri("/v1/itineraries/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(0);
    }

    @Test
    void aMemberWhoIsNotTheOwnerCanBuildTheDaySkeleton() {
        String ownerToken = freshTraveler();
        String tripId = createItinerary(ownerToken, """
                {"title":"Cebu","destinations":["Cebu"]}
                """);
        String memberToken = admitMemberTo(tripId);
        lock(memberToken, tripId);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Arrival & Sunsets"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.ordinal")
                .isEqualTo(1)
                .jsonPath("$.title")
                .isEqualTo("Arrival & Sunsets");

        UUID firstDayId = dayIdAtOrdinal(tripId, 1);
        rest.patch()
                .uri("/v1/itineraries/" + tripId + "/days/" + firstDayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Arrival Day"}
                        """)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Arrival Day");

        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/days/" + firstDayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(dayCount(tripId)).as("the member's delete removed the day").isEqualTo(0);
    }

    @Test
    void deletingAMiddleDayRenumbersOverHttp() {
        String token = freshTraveler();
        String tripId =
                createItinerary(
                        token,
                        """
                        {"title":"Palawan","destinations":["Palawan"],"durationDays":5}
                        """);
        UUID thirdDay = dayIdAtOrdinal(tripId, 3);
        lock(token, tripId);

        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/days/" + thirdDay)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(4)
                .jsonPath("$.days[3].ordinal")
                .isEqualTo(4);
    }

    @Test
    void aNonMemberIsMaskedOnEveryDayEndpoint() {
        String ownerToken = freshTraveler();
        String tripId = createItinerary(ownerToken, """
                {"title":"Private","destinations":["Kyoto"],"durationDays":1}
                """);
        UUID dayId = dayIdAtOrdinal(tripId, 1);
        String stranger = freshTraveler();

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.patch()
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void aVisitorWithNoTokenIsRejectedAtTheSecurityChain() {
        rest.post()
                .uri("/v1/itineraries/" + UUID.randomUUID() + "/days")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void aDayOfAnotherPlanIsNotFound() {
        String token = freshTraveler();
        String tripA = createItinerary(token, """
                {"title":"A","destinations":["A"],"durationDays":1}
                """);
        String tripB = createItinerary(token, """
                {"title":"B","destinations":["B"],"durationDays":1}
                """);
        UUID dayOfB = dayIdAtOrdinal(tripB, 1);
        lock(token, tripA);

        rest.patch()
                .uri("/v1/itineraries/" + tripA + "/days/" + dayOfB)
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
                .isEqualTo("DAY_NOT_FOUND");
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
        UUID memberId =
                UUID.fromString(
                        fieldIn(
                                rest.get()
                                        .uri("/v1/me")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                                        .exchange()
                                        .expectStatus()
                                        .isOk()
                                        .expectBody()
                                        .returnResult()
                                        .getResponseBodyContent(),
                                "id"));
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

    private UUID dayIdAtOrdinal(String itineraryId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = ?",
                UUID.class,
                UUID.fromString(itineraryId),
                ordinal);
    }

    private int dayCount(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM day WHERE itinerary_id = ?", Integer.class, UUID.fromString(itineraryId));
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
