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

/**
 * Ticket 01's ACs over HTTP (spec AC 1/2/4/6): create-with-duration embeds days, the day endpoints
 * append/rename/delete, <strong>a non-owner member can do all of it</strong>, and the guard masks a
 * non-member on every new endpoint.
 *
 * <p>The member fixture is the story's point (spec Q8: members shape the plan). Rather than drive the
 * whole S1.2 invite→accept flow — which would couple these tests to the invitation module — a member
 * is admitted directly: the second traveler is provisioned by an authenticated call, then a {@code
 * MEMBER} row is inserted into their workspace. That is the exact state a real accept produces; what
 * this class proves is that the day endpoints honour it.
 */
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

    /**
     * <strong>The create RESPONSE carries the seeded days</strong> — not just a later {@code GET}.
     *
     * <p>Found by the device smoke test, not by a test: the mobile client seeds its detail cache from
     * this response, so when it omitted the days a freshly created 3-day trip rendered "No days yet"
     * until something forced a refetch. The old assertions (a later {@code GET} embeds days) passed
     * throughout — they could not see the interaction. This is the regression guard.
     */
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

        // The plan embeds on the single fetch: five days, ordinals 1..5, each with an empty activity list.
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
        // The owner creates the trip; a second traveler is admitted as MEMBER (the state a real accept
        // produces). Everything below is that member acting — the collaboration S1.3 exists to test.
        String ownerToken = freshTraveler();
        String tripId = createItinerary(ownerToken, """
                {"title":"Cebu","destinations":["Cebu"]}
                """);
        String memberToken = admitMemberTo(tripId);

        // Append a titled day, as the member — 201, ordinal 1, the title round-trips.
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

        // Rename it, as the member — a PATCH round-trips the new title.
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

        // Delete it, as the member — the plan goes back to zero days.
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

        // Append: 404 (masking — same as trying to read someone else's trip).
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isNotFound();
        // Rename: 404.
        rest.patch()
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus()
                .isNotFound();
        // Delete: 404.
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

        // Same owner, but the day belongs to trip B — addressing it under trip A is 404 (DAY_NOT_FOUND).
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

    // --- fixtures ---------------------------------------------------------------------------------

    /**
     * Provisions a second traveler (via an authenticated call), then inserts a MEMBER row into the
     * trip's workspace — the exact state a real S1.2 accept produces — and returns their token.
     */
    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        // Provision the traveler by making one authenticated call as them (the /me path the app uses).
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
