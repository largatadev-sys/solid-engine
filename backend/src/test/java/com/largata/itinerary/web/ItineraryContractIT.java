package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


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
                        {"title":"Hokkaido in winter","destination":"Sapporo",
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
                .jsonPath("$.destination")
                .isEqualTo("Sapporo")
                .jsonPath("$.currency")
                .isEqualTo("PHP")
                .jsonPath("$.startDate")
                .isEqualTo("2027-01-10")
                .jsonPath("$.endDate")
                .isEqualTo("2027-01-20")
                .jsonPath("$.state")
                .isEqualTo("draft")
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.visibility")
                .isEqualTo("public")
                .jsonPath("$.createdAt")
                .exists();
    }

    @Test
    void theCreatorCanFetchTheirOwnItinerary() {
        String token = freshTraveler();
        String id = createItinerary(token, """
                {"title":"Lisbon","destination":"Lisbon"}
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


    @Test
    void anotherTravelerCannotSeeMyItineraryAndCannotTellItExists() {
        String mine = createItinerary(freshTraveler(), """
                {"title":"Private trip","destination":"Kyoto"}
                """);
        String stranger = freshTraveler();

        byte[] notYours = fetchRejection(stranger, mine);
        byte[] noSuchThing = fetchRejection(stranger, UUID.randomUUID().toString());

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
                        {"title":"x","destination":"y"}
                        """)
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    void anItineraryWithNoDatesIsALegitimatePlan() {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Japan, someday","destination":"Japan"}
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
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Open-ended","destination":"Patagonia","startDate":"2027-06-03"}
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
                        {"title":"Back by then","destination":"Home","endDate":"2027-06-03"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated();
    }

    @Test
    void aBlankTitleIsRejectedAsAValidationFailure() {
        expectBadRequest("""
                {"title":"   ","destination":"Lisbon"}
                """);
    }

    @Test
    void aMissingTitleIsRejected() {
        expectBadRequest("""
                {"destination":"Lisbon"}
                """);
    }

    @Test
    void anAbsentDestinationIsRejected() {
        expectBadRequest("""
                {"title":"Nowhere"}
                """);
    }

    @Test
    void theLegacyDestinationsListIsRefusedRatherThanSilentlyAccepted() {
        expectBadRequest("""
                {"title":"Nowhere","destinations":["Sapporo","Otaru"]}
                """);
    }

    @Test
    void aBlankDestinationEntryIsRejected() {
        expectBadRequest("""
                {"title":"Somewhere","destination":"  "}
                """);
    }

    @Test
    void aTitleOverTheLimitIsRejected() {
        expectBadRequest(
                """
                {"title":"%s","destination":"Lisbon"}
                """
                        .formatted("x".repeat(121)));
    }

    @Test
    void anEndDateBeforeTheStartDateIsRejected() {
        expectBadRequest(
                """
                {"title":"Backwards","destination":"Lisbon","startDate":"2027-06-10","endDate":"2027-06-03"}
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


    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
