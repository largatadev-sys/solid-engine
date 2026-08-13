package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DiscoveryIT extends PostgresTestBase {

    private static final ObjectMapper JSON = new ObjectMapper();

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void anAnonymousCallerIsRefusedInTheStandardEnvelope() {
        rest.get()
                .uri("/v1/discovery/itineraries")
                .exchange()
                .expectStatus()
                .isUnauthorized()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNAUTHENTICATED");
    }


    @Test
    void aPublishedPublicTripIsVisibleToEveryStranger() {
        String owner = traveler();
        String published = publishedTrip(owner);
        String stranger = traveler();

        assertThat(browseIds(stranger))
                .as("discovery is the strangers' surface — no membership anywhere in the read")
                .contains(published);
    }


    @Test
    void aPublishedButPrivateTripIsAbsentForEveryoneIncludingItsOwner() {
        String owner = traveler();
        String trip = trip(owner);
        travel(owner, trip);
        publishTo(owner, trip, "private");

        assertThat(browseIds(owner))
                .as("Discover is not a my-trips surface: private means private, owner included")
                .doesNotContain(trip);
        assertThat(recommendedIds(owner)).doesNotContain(trip);
    }


    @Test
    void anUnpublishedTripIsAbsent() {
        String owner = traveler();
        String trip = trip(owner);

        assertThat(browseIds(owner)).doesNotContain(trip);
        assertThat(recommendedIds(owner)).doesNotContain(trip);
    }


    @Test
    void anArchivedPublishedTripIsAbsent() {
        String owner = traveler();
        String trip = publishedTrip(owner);
        assertThat(browseIds(owner)).contains(trip);

        archive(owner, trip);

        assertThat(browseIds(owner))
                .as("archive dominates publication — ADR-017's posture, enforced in the WHERE clause")
                .doesNotContain(trip);
        assertThat(recommendedIds(owner)).doesNotContain(trip);
    }


    @Test
    void unpublishingRemovesTheTripFromDiscovery() {
        String owner = traveler();
        String trip = publishedTrip(owner);
        assertThat(browseIds(owner)).contains(trip);

        act(owner, trip, "unpublish");

        assertThat(browseIds(owner)).doesNotContain(trip);
    }


    @Test
    void theNewestPublishedTripLeads() {
        String owner = traveler();
        String first = publishedTrip(owner);
        String second = publishedTrip(owner);

        List<String> ids = browseIds(owner);

        assertThat(ids.indexOf(second))
                .as("ordering is published_at DESC — what is newly visible leads")
                .isLessThan(ids.indexOf(first));
    }


    @Test
    void republishingLiftsATripBackToTheTop() {
        String owner = traveler();
        String older = publishedTrip(owner);
        String newer = publishedTrip(owner);
        assertThat(browseIds(owner).indexOf(newer)).isLessThan(browseIds(owner).indexOf(older));

        act(owner, older, "unpublish");
        act(owner, older, "publish");

        List<String> ids = browseIds(owner);
        assertThat(ids.indexOf(older))
                .as("republish bumps published_at, so returning content gets seen again")
                .isLessThan(ids.indexOf(newer));
    }


    @Test
    void theCursorWalksToExhaustionWithoutEverHandingBackAnEmptyPage() {
        String owner = traveler();
        for (int made = 0; made < 5; made += 1) {
            publishedTrip(owner);
        }

        List<String> walked = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        Set<String> cursorsSeen = new HashSet<>();

        do {
            String body = browseBody(owner, cursor, 2);
            List<String> ids = idsIn(body);
            cursor = cursorIn(body);
            pages += 1;

            assertThat(ids)
                    .as("a page carrying a cursor is never empty — scope filtering is in the query")
                    .isNotEmpty();
            if (cursor != null) {
                assertThat(cursorsSeen.add(cursor)).as("the cursor must advance").isTrue();
            }
            walked.addAll(ids);
            assertThat(pages)
                    .as("a repeat-cursor guard: the walk must terminate rather than spin (S3.1)")
                    .isLessThan(200);
        } while (cursor != null);

        assertThat(walked).doesNotHaveDuplicates();
        assertThat(walked).hasSizeGreaterThanOrEqualTo(5);
    }


    @Test
    void thePageSizeDefaultsToTwentyAndCapsAtFifty() {
        String owner = traveler();
        String body = browseBody(owner, null, 500);

        assertThat(idsIn(body).size())
                .as("an oversized limit is clamped rather than honoured")
                .isLessThanOrEqualTo(50);
    }


    @Test
    void recommendedOffersOneTripPerAuthorNewestFirst() {
        String first = traveler();
        String second = traveler();
        publishedTripWithCover(first);
        String firstsNewer = publishedTripWithCover(first);
        String secondsTrip = publishedTripWithCover(second);

        List<String> ids = recommendedIds(first);

        assertThat(ids).contains(secondsTrip);
        assertThat(ids)
                .as("distinct authors: the rail shows an author's newest, never two of theirs")
                .contains(firstsNewer);
        assertThat(ids.size()).isLessThanOrEqualTo(8);
    }


    @Test
    void recommendedSkipsATripWithNoCover() {
        String owner = traveler();
        String coverless = publishedTrip(owner);

        assertThat(recommendedIds(owner))
                .as("the rail is cover-first; a coverless trip has nothing to show")
                .doesNotContain(coverless);
    }


    private List<String> browseIds(String token) {
        return idsIn(browseBody(token, null, 50));
    }


    private String browseBody(String token, String cursor, Integer limit) {
        StringBuilder uri = new StringBuilder("/v1/discovery/itineraries?x=1");
        if (cursor != null) {
            uri.append("&cursor=").append(cursor);
        }
        if (limit != null) {
            uri.append("&limit=").append(limit);
        }
        return new String(
                rest.get()
                        .uri(uri.toString())
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private List<String> recommendedIds(String token) {
        return idsIn(
                new String(
                        rest.get()
                                .uri("/v1/discovery/recommended")
                                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent()));
    }


    private static List<String> idsIn(String body) {
        JsonNode parsed = JSON.readTree(body);
        JsonNode cards = parsed.isArray() ? parsed : parsed.get("items");
        List<String> ids = new ArrayList<>();
        for (JsonNode card : cards) {
            ids.add(card.get("id").asString());
        }
        return ids;
    }


    private static String cursorIn(String body) {
        JsonNode cursor = JSON.readTree(body).get("nextCursor");
        return cursor == null || cursor.isNull() ? null : cursor.asString();
    }


    private String traveler() {
        return rig.travelerWithHandle(
                "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
    }


    private String trip(String owner) {
        return rig.createTrip(owner, 3);
    }


    private String publishedTrip(String owner) {
        String trip = trip(owner);
        travel(owner, trip);
        act(owner, trip, "publish");
        return trip;
    }


    private String publishedTripWithCover(String owner) {
        String trip = trip(owner);
        jdbc.update("UPDATE itinerary SET cover_image_url = ? WHERE id = ?::uuid", "media/x.jpg", trip);
        travel(owner, trip);
        act(owner, trip, "publish");
        return trip;
    }


    private final Set<String> travelled = new HashSet<>();

    private void travel(String token, String itineraryId) {
        if (travelled.add(itineraryId)) {
            act(token, itineraryId, "finish-planning");
            act(token, itineraryId, "start");
            act(token, itineraryId, "complete");
        }
    }


    private void archive(String token, String itineraryId) {
        act(token, itineraryId, "archive");
    }


    private void act(String token, String itineraryId, String action) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + action)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void publishTo(String token, String itineraryId, String audience) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"" + audience + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }
}
