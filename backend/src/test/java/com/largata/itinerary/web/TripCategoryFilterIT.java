package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.ArrayList;
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
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripCategoryFilterIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theThreeCategoriesAreMutuallyExclusive_aTripIsInExactlyOne() {
        String owner = freshTraveler();
        String fresh = createItinerary(owner, "A fresh draft");

        assertThat(idsIn(owner, "draft")).contains(fresh);
        assertThat(idsIn(owner, "active")).doesNotContain(fresh);
        assertThat(idsIn(owner, "complete")).doesNotContain(fresh);
    }


    @Test
    void theLifecycleMovesATripBetweenCategories_becauseTheCategoriesAreTheLifecycle() {
        String owner = freshTraveler();
        String trip = createItinerary(owner, "Island Hopping");

        act(owner, trip, "start");

        assertThat(idsIn(owner, "active")).contains(trip);
        assertThat(idsIn(owner, "draft")).doesNotContain(trip);

        act(owner, trip, "complete");

        assertThat(idsIn(owner, "complete")).contains(trip);
        assertThat(idsIn(owner, "active")).doesNotContain(trip);

        act(owner, trip, "reopen");

        assertThat(idsIn(owner, "active")).as("the one-step undo moves it back").contains(trip);
        assertThat(idsIn(owner, "complete")).doesNotContain(trip);
    }


    @Test
    void publishingDoesNotMoveATripBetweenCategories() {
        String owner = freshTraveler();
        String trip = createItinerary(owner, "Under way");
        act(owner, trip, "start");
        act(owner, trip, "complete");
        act(owner, trip, "publish");

        assertThat(idsIn(owner, "complete"))
                .as("discovery is its own axis — publishing says nothing about where the trip is in its life")
                .contains(trip);
        assertThat(idsIn(owner, "draft")).doesNotContain(trip);
    }


    @Test
    void noCategoryMeansEveryTrip_theShippedBehaviourIsUntouched() {
        String owner = freshTraveler();
        String one = createItinerary(owner, "One");
        String two = createItinerary(owner, "Two");
        act(owner, two, "start");

        assertThat(idsIn(owner, null)).contains(one, two);
    }


    @Test
    void theCategoryIsCaseInsensitiveAndAnUnknownOneIsRefusedRatherThanIgnored() {
        String owner = freshTraveler();
        createItinerary(owner, "Anything");

        list(owner, "COMPLETE").expectStatus().isOk();
        list(owner, "  complete  ").expectStatus().isOk();

        list(owner, "unlisted")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNKNOWN_TRIP_CATEGORY");
    }


    @Test
    void aPublicationValueIsNotACategory_theAxesDoNotShareAVocabulary() {
        String owner = freshTraveler();
        createItinerary(owner, "Anything");

        list(owner, "public")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNKNOWN_TRIP_CATEGORY");
    }


    @Test
    void theCategorySurvivesPagination_theFilterIsInTheQueryNotThePage() {
        String owner = freshTraveler();
        List<String> travelled = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            createItinerary(owner, "Draft " + i);
            String trip = createItinerary(owner, "Travelled " + i);
            act(owner, trip, "start");
            act(owner, trip, "complete");
            travelled.add(trip);
        }

        List<String> firstPage = idsIn(owner, "complete", 2);
        assertThat(firstPage).hasSize(2).allSatisfy(id -> assertThat(travelled).contains(id));

        String cursor = cursorOf(owner, "complete", 2);
        assertThat(cursor).as("a filtered page still carries a cursor when more remain").isNotNull();

        List<String> secondPage = pageAfter(owner, "complete", cursor);
        assertThat(secondPage)
                .as("the second page is filtered too — not a full page trimmed after the fact")
                .isNotEmpty()
                .allSatisfy(id -> assertThat(travelled).contains(id));
    }


    private RestTestClient.ResponseSpec list(String token, String category) {
        String uri = "/v1/itineraries" + (category == null ? "" : "?category=" + encode(category));
        return rest.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private static String encode(String raw) {
        return java.net.URLEncoder.encode(raw, java.nio.charset.StandardCharsets.UTF_8);
    }

    private List<String> idsIn(String token, String category) {
        return idsFrom(bodyOf(list(token, category)));
    }

    private List<String> idsIn(String token, String category, int limit) {
        return idsFrom(bodyOf(pageRequest(token, category, limit, null)));
    }

    private List<String> pageAfter(String token, String category, String cursor) {
        return idsFrom(bodyOf(pageRequest(token, category, 2, cursor)));
    }

    private String cursorOf(String token, String category, int limit) {
        var node = JSON.readTree(bodyOf(pageRequest(token, category, limit, null))).get("nextCursor");
        return node == null || node.isNull() ? null : node.asString();
    }

    private RestTestClient.ResponseSpec pageRequest(String token, String category, int limit, String cursor) {
        String uri =
                "/v1/itineraries?limit=" + limit
                        + (category == null ? "" : "&category=" + encode(category))
                        + (cursor == null ? "" : "&cursor=" + encode(cursor));
        return rest.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private static String bodyOf(RestTestClient.ResponseSpec spec) {
        return new String(spec.expectStatus().isOk().expectBody().returnResult().getResponseBodyContent());
    }

    private static List<String> idsFrom(String body) {
        List<String> ids = new ArrayList<>();
        JSON.readTree(body).get("items").forEach(item -> ids.add(item.get("id").asString()));
        return ids;
    }

    private void act(String token, String itineraryId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createItinerary(String token, String title) {
        return JSON.readTree(
                        new String(
                                rest.post()
                                        .uri("/v1/itineraries")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body("{\"title\":\"" + title + "\",\"destinations\":[\"Palawan\"]}")
                                        .exchange()
                                        .expectStatus()
                                        .isCreated()
                                        .expectBody()
                                        .returnResult()
                                        .getResponseBodyContent()))
                .get("id")
                .asString();
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
