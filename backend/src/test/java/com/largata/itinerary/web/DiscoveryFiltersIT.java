package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DiscoveryFiltersIT extends PostgresTestBase {

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
    void aQueryMatchesTheTitleCaseInsensitively() {
        String owner = traveler();
        String match = publishedTrip(owner, "Kyoto Temples and Tea", "Kyoto, Japan", 5);
        publishedTrip(owner, "Surfing Siargao", "Siargao", 5);

        assertThat(browseIds(owner, "?q=kyoto")).contains(match);
        assertThat(browseIds(owner, "?q=KYOTO")).contains(match);
    }


    @Test
    void aQueryAlsoMatchesTheDestinationStrings() {
        String owner = traveler();
        String match = publishedTrip(owner, "A week away", "Osaka, Japan", 5);

        assertThat(browseIds(owner, "?q=osaka"))
                .as("the mock searches destinations as well as titles")
                .contains(match);
    }


    @Test
    void aQueryMatchesTheMiddleOfAWordBecauseItIsASubstringSearch() {
        String owner = traveler();
        String match = publishedTrip(owner, "Island Hopping", "El Nido", 3);

        assertThat(browseIds(owner, "?q=nido")).contains(match);
    }


    @Test
    void aSingleCharacterQueryIsRefusedByTheServer() {
        String owner = traveler();

        rest.get()
                .uri("/v1/discovery/itineraries?q=a")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("QUERY_TOO_SHORT");
    }


    @Test
    void anOverlongQueryIsRefusedByTheServer() {
        String owner = traveler();

        rest.get()
                .uri("/v1/discovery/itineraries?q=" + "x".repeat(81))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("QUERY_TOO_LONG");
    }


    @Test
    void theDestinationFilterMatchesWholeStringsIgnoringCaseAndPadding() {
        String owner = traveler();
        String tokyo = publishedTrip(owner, "Tokyo days", "  Tokyo  ", 4);
        String kyoto = publishedTrip(owner, "Kyoto days", "Kyoto", 4);

        List<String> found = browseIds(owner, "?destination=tokyo");

        assertThat(found).contains(tokyo);
        assertThat(found).doesNotContain(kyoto);
    }


    @Test
    void theDurationBandsFilterOnTheDayCountAtTheirBoundaries() {
        String owner = traveler();
        String three = publishedTrip(owner, "Three days", "Somewhere", 3);
        String four = publishedTrip(owner, "Four days", "Somewhere", 4);
        String seven = publishedTrip(owner, "Seven days", "Somewhere", 7);
        String fifteen = publishedTrip(owner, "Fifteen days", "Somewhere", 15);

        assertThat(browseIds(owner, "?duration=1-3")).contains(three).doesNotContain(four);
        assertThat(browseIds(owner, "?duration=4-7")).contains(four, seven).doesNotContain(three);
        assertThat(browseIds(owner, "?duration=15%2B"))
                .as("the open-ended band takes everything past a fortnight")
                .contains(fifteen)
                .doesNotContain(seven);
    }


    @Test
    void anUnknownDurationIsRefusedRatherThanIgnored() {
        String owner = traveler();

        rest.get()
                .uri("/v1/discovery/itineraries?duration=forever")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNKNOWN_DURATION");
    }


    @Test
    void filtersCombineRatherThanOverridingOneAnother() {
        String owner = traveler();
        String wanted = publishedTrip(owner, "Kyoto in spring", "Kyoto", 5);
        publishedTrip(owner, "Kyoto in spring", "Kyoto", 20);
        publishedTrip(owner, "Osaka in spring", "Osaka", 5);

        List<String> found = browseIds(owner, "?q=spring&destination=Kyoto&duration=4-7");

        assertThat(found).containsExactly(wanted);
    }


    @Test
    void theCountAgreesWithTheListUnderIdenticalFilters() {
        String owner = traveler();
        publishedTrip(owner, "Kyoto one", "Kyoto", 5);
        publishedTrip(owner, "Kyoto two", "Kyoto", 5);
        publishedTrip(owner, "Osaka one", "Osaka", 5);

        for (String filter : List.of("", "?q=kyoto", "?destination=Kyoto", "?duration=4-7",
                "?q=kyoto&destination=Kyoto&duration=4-7")) {
            assertThat((long) browseIds(owner, filter).size())
                    .as("the sheet promises the count the list will deliver: " + filter)
                    .isEqualTo(countFor(owner, filter));
        }
    }


    @Test
    void theCountAgreesWithTheListEvenWhenTheMatchesOutrunOnePage() {
        String owner = traveler();
        String destination = "Pagination " + UUID.randomUUID().toString().substring(0, 8);
        for (int made = 0; made < 21; made += 1) {
            publishedTrip(owner, "Paged trip " + made, destination, 5);
        }
        String filter = "?destination=" + destination.replace(" ", "%20");
        long counted = countFor(owner, filter);

        assertThat(counted)
                .as("the fixture must outrun one page, or this test proves nothing about paging")
                .isGreaterThan(firstPageSize(owner, filter));
        assertThat((long) browseIds(owner, filter).size())
                .as("the sheet promises every match, not merely the first page of them")
                .isEqualTo(counted);
    }


    @Test
    void theCountExcludesExactlyWhatTheListExcludes() {
        String owner = traveler();
        String archived = publishedTrip(owner, "Archived trip", "Nowhere", 3);
        long before = countFor(owner, "");

        act(owner, archived, "archive");

        assertThat(countFor(owner, ""))
                .as("an archived trip leaves the count as well as the list")
                .isEqualTo(before - 1);
    }


    @Test
    void trendingRanksDestinationsByPublishCountInTheWindow() {
        String owner = traveler();
        publishedTrip(owner, "Bali one", "Bali", 3);
        publishedTrip(owner, "Bali two", "Bali", 3);
        publishedTrip(owner, "Lima one", "Lima", 3);

        List<JsonNode> trending = trendingFor(owner);
        JsonNode bali = named(trending, "Bali");
        JsonNode lima = named(trending, "Lima");

        assertThat(bali.get("tripCount").asLong()).isEqualTo(2);
        assertThat(lima.get("tripCount").asLong()).isEqualTo(1);
        assertThat(trending.indexOf(bali)).isLessThan(trending.indexOf(lima));
    }


    @Test
    void trendingGroupsSpellingsThatDifferOnlyByCaseOrPadding() {
        String owner = traveler();
        publishedTrip(owner, "One", "  paris  ", 3);
        publishedTrip(owner, "Two", "PARIS", 3);

        List<JsonNode> trending = trendingFor(owner);
        List<String> spellings =
                trending.stream().map(row -> row.get("destination").asString()).toList();

        assertThat(spellings.stream().filter(name -> name.equalsIgnoreCase("paris")).count())
                .as("one row per destination, however its travelers spelled it")
                .isEqualTo(1);
        assertThat(named(trending, "PARIS").get("tripCount").asLong()).isEqualTo(2);
    }


    @Test
    void trendingCountsPublishesNotCreations() {
        String owner = traveler();
        String unpublished = rig.createTrip(owner, 3);
        jdbc.update(
                "UPDATE itinerary SET destination = ? WHERE id = ?::uuid",
                "Reykjavik",
                unpublished);

        assertThat(trendingFor(owner).stream().map(row -> row.get("destination").asString()))
                .as("private activity must not leak, even as a count")
                .doesNotContain("Reykjavik");
    }


    @Test
    void trendingIgnoresATripPublishedBeforeTheWindowOpened() {
        String owner = traveler();
        String old = publishedTrip(owner, "Long ago", "Antarctica", 3);
        jdbc.update(
                "UPDATE itinerary SET published_at = ? WHERE id = ?::uuid",
                java.sql.Timestamp.from(Instant.now().minus(40, ChronoUnit.DAYS)),
                old);

        assertThat(trendingFor(owner).stream().map(row -> row.get("destination").asString()))
                .as("the rail is the trailing 30 days, not all time")
                .doesNotContain("Antarctica");
    }


    @Test
    void suggestionsGroupDestinationsAndItinerariesSeparately() {
        String owner = traveler();
        publishedTrip(owner, "Tokyo food crawl", "Tokyo, Japan", 4);

        JsonNode suggestions = suggestionsFor(owner, "tok");

        assertThat(fieldList(suggestions, "destinations")).anyMatch(name -> name.contains("Tokyo"));
        assertThat(fieldList(suggestions, "itineraries")).contains("Tokyo food crawl");
    }


    @Test
    void suggestionsCapEachGroupAtThree() {
        String owner = traveler();
        for (int made = 0; made < 5; made += 1) {
            publishedTrip(owner, "Zanzibar trip " + made, "Zanzibar " + made, 3);
        }

        JsonNode suggestions = suggestionsFor(owner, "zanzibar");

        assertThat(fieldList(suggestions, "destinations")).hasSizeLessThanOrEqualTo(3);
        assertThat(fieldList(suggestions, "itineraries")).hasSizeLessThanOrEqualTo(3);
    }


    @Test
    void suggestionsNeverLeakAPrivateOrArchivedTrip() {
        String owner = traveler();
        String archived = publishedTrip(owner, "Secretville archived", "Secretville", 3);
        act(owner, archived, "archive");

        String privateTrip = rig.createTrip(owner, 3);
        jdbc.update(
                "UPDATE itinerary SET destination = ? WHERE id = ?::uuid",
                "Secretville",
                privateTrip);

        JsonNode suggestions = suggestionsFor(owner, "secretville");

        assertThat(fieldList(suggestions, "destinations")).isEmpty();
        assertThat(fieldList(suggestions, "itineraries")).isEmpty();
    }


    private List<String> browseIds(String token, String query) {
        String base = "/v1/discovery/itineraries" + (query.isEmpty() ? "?v=1" : query);
        List<String> ids = new ArrayList<>();
        Set<String> cursorsSeen = new HashSet<>();
        String cursor = null;

        do {
            String uri =
                    cursor == null
                            ? base
                            : base + "&cursor=" + URLEncoder.encode(cursor, StandardCharsets.UTF_8);
            JsonNode parsed = JSON.readTree(get(token, uri));
            for (JsonNode card : parsed.get("items")) {
                ids.add(card.get("id").asString());
            }
            JsonNode next = parsed.get("nextCursor");
            cursor = next == null || next.isNull() ? null : next.asString();
            if (cursor != null && !cursorsSeen.add(cursor)) {
                throw new IllegalStateException(
                        "the server handed back cursor " + cursor + " twice; paging would not end");
            }
        } while (cursor != null);

        return ids;
    }


    private long firstPageSize(String token, String query) {
        String body = get(token, "/v1/discovery/itineraries" + (query.isEmpty() ? "?v=1" : query));
        return JSON.readTree(body).get("items").size();
    }


    private long countFor(String token, String query) {
        String body = get(token, "/v1/discovery/count" + (query.isEmpty() ? "?v=1" : query));
        return JSON.readTree(body).get("count").asLong();
    }


    private List<JsonNode> trendingFor(String token) {
        JsonNode parsed = JSON.readTree(get(token, "/v1/discovery/trending"));
        List<JsonNode> rows = new ArrayList<>();
        parsed.forEach(rows::add);
        return rows;
    }


    private JsonNode suggestionsFor(String token, String query) {
        return JSON.readTree(get(token, "/v1/discovery/suggestions?q=" + query));
    }


    private static List<String> fieldList(JsonNode node, String field) {
        List<String> values = new ArrayList<>();
        node.get(field).forEach(entry -> values.add(entry.asString()));
        return values;
    }


    private static JsonNode named(List<JsonNode> rows, String destination) {
        return rows.stream()
                .filter(row -> row.get("destination").asString().equalsIgnoreCase(destination))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No trending row for " + destination));
    }


    private String get(String token, String uri) {
        return new String(
                rest.get()
                        .uri(java.net.URI.create("http://localhost:" + port + uri))
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private String traveler() {
        return rig.travelerWithHandle(
                "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
    }


    private String publishedTrip(String owner, String title, String destination, int days) {
        String trip = rig.createTrip(owner, days);
        jdbc.update(
                "UPDATE itinerary SET title = ?, destination = ? WHERE id = ?::uuid",
                title,
                destination,
                trip);
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


    private void act(String token, String itineraryId, String action) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + action)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }
}
