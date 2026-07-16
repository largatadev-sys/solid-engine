package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Ticket 03's ACs over HTTP: the create/view contract, and the guard's first proof through the whole
 * chain.
 *
 * <p>The pagination ACs live in {@link ItineraryListIT} — one test class per file (Failsafe matches
 * {@code *IT} on the outer class only; a nested one is silently skipped, which looks exactly like
 * passing — CLAUDE.md's S0.1 gotcha).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void creatingAnItineraryReturnsItAsADraftPrivateResource() {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        """
                        {"title":"Hokkaido in winter","destinations":["Sapporo","Otaru"],
                         "startDate":"2027-01-10","endDate":"2027-01-20"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.id")
                .exists()
                .jsonPath("$.title")
                .isEqualTo("Hokkaido in winter")
                .jsonPath("$.destinations")
                .isEqualTo(List.of("Sapporo", "Otaru"))
                .jsonPath("$.startDate")
                .isEqualTo("2027-01-10")
                .jsonPath("$.endDate")
                .isEqualTo("2027-01-20")
                // The AC, asserted on the wire: born draft and private. Nothing in S0.3 can produce
                // any other value — publishing is an explicit act at S4.1.
                .jsonPath("$.state")
                .isEqualTo("draft")
                .jsonPath("$.visibility")
                .isEqualTo("private")
                .jsonPath("$.createdAt")
                .exists();
    }

    @Test
    void theCreatorCanFetchTheirOwnItinerary() {
        String token = freshTraveler();
        String id = createItinerary(token, """
                {"title":"Lisbon","destinations":["Lisbon"]}
                """);

        rest.get()
                .uri("/v1/itineraries/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(id)
                .jsonPath("$.title")
                .isEqualTo("Lisbon");
    }

    /**
     * <strong>The story's headline AC</strong> (epic map: "another authenticated user → 404 on my
     * private itinerary") and the guard's first proof — asserted as an <em>indistinguishability</em>
     * rather than merely a status code.
     *
     * <p>A 404 alone would pass with an implementation that leaked: if the "not yours" answer
     * differed from the "no such id" answer in code, message, or body length, a prober could learn
     * which ids are real by the shape of the rejection. Artifact 03 requires the two to be one
     * answer, so the test compares them byte for byte.
     */
    @Test
    void anotherTravelerCannotSeeMyItineraryAndCannotTellItExists() {
        String mine = createItinerary(freshTraveler(), """
                {"title":"Private trip","destinations":["Kyoto"]}
                """);
        String stranger = freshTraveler();

        byte[] notYours = fetchRejection(stranger, mine);
        byte[] noSuchThing = fetchRejection(stranger, UUID.randomUUID().toString());

        // Only traceId and timestamp legitimately differ between two requests; everything the
        // client can branch on must match.
        assertThat(codeIn(notYours)).isEqualTo("ITINERARY_NOT_FOUND").isEqualTo(codeIn(noSuchThing));
        assertThat(messageIn(notYours)).isEqualTo(messageIn(noSuchThing));
    }

    @Test
    void aVisitorWithNoTokenIsRejectedAtTheSecurityChain() {
        rest.get().uri("/v1/itineraries").exchange().expectStatus().isUnauthorized();
        rest.get().uri("/v1/itineraries/" + UUID.randomUUID()).exchange().expectStatus().isUnauthorized();
        rest.post()
                .uri("/v1/itineraries")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"x","destinations":["y"]}
                        """)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void anItineraryWithNoDatesIsALegitimatePlan() {
        // The dreamer's draft ("Japan, someday") and E4's fork both produce these — the reason dates
        // are optional at all (spec, Q4).
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Japan, someday","destinations":["Japan"]}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.startDate")
                .doesNotExist()
                .jsonPath("$.endDate")
                .doesNotExist();
    }

    @Test
    void aStartDateWithoutAnEndDateIsALegitimatePlan() {
        // "Departing June 3, open-ended" — the dates are independently settable, not a pair.
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Open-ended","destinations":["Patagonia"],"startDate":"2027-06-03"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.startDate")
                .isEqualTo("2027-06-03")
                .jsonPath("$.endDate")
                .doesNotExist();
    }

    @Test
    void anEndDateWithoutAStartDateIsAccepted() {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Back by then","destinations":["Home"],"endDate":"2027-06-03"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated();
    }

    @Test
    void aBlankTitleIsRejectedAsAValidationFailure() {
        expectBadRequest("""
                {"title":"   ","destinations":["Lisbon"]}
                """);
    }

    @Test
    void aMissingTitleIsRejected() {
        expectBadRequest("""
                {"destinations":["Lisbon"]}
                """);
    }

    @Test
    void anEmptyDestinationsListIsRejected() {
        expectBadRequest("""
                {"title":"Nowhere","destinations":[]}
                """);
    }

    @Test
    void aBlankDestinationEntryIsRejected() {
        expectBadRequest("""
                {"title":"Somewhere","destinations":["  "]}
                """);
    }

    @Test
    void aTitleOverTheLimitIsRejected() {
        expectBadRequest(
                """
                {"title":"%s","destinations":["Lisbon"]}
                """
                        .formatted("x".repeat(121)));
    }

    @Test
    void anEndDateBeforeTheStartDateIsRejected() {
        expectBadRequest(
                """
                {"title":"Backwards","destinations":["Lisbon"],"startDate":"2027-06-10","endDate":"2027-06-03"}
                """);
    }

    @Test
    void aMalformedItineraryIdIsABadRequestNotAServerError() {
        rest.get()
                .uri("/v1/itineraries/not-a-uuid")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("MALFORMED_REQUEST");
    }

    private void expectBadRequest(String body) {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                // The envelope, not a Spring default body: the client branches on code (Artifact 05).
                .jsonPath("$.code")
                .exists()
                .jsonPath("$.message")
                .exists()
                .jsonPath("$.traceId")
                .exists();
    }

    private byte[] fetchRejection(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
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

    private static String codeIn(byte[] body) {
        return fieldIn(body, "code");
    }

    private static String messageIn(byte[] body) {
        return fieldIn(body, "message");
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    /** A token for a traveler nobody else in this run shares — provisioned on first contact. */
    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
