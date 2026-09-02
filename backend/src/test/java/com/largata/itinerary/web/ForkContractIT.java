package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
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
class ForkContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aForkIsBornADraftOwnedSolelyByTheForker() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String forker = freshTraveler();

        JsonNode fork = forkOf(forker, sourceId);

        assertThat(fork.get("id").asString()).isNotEqualTo(sourceId);
        assertThat(fork.get("state").asString()).isEqualTo("upcoming");
        assertThat(fork.get("published").asBoolean()).isFalse();
        assertThat(fork.get("visibility").asString())
                .as("the newborn default, never the source's audience")
                .isEqualTo("public");
        assertThat(fork.get("archived").asBoolean()).isFalse();

        UUID forkId = UUID.fromString(fork.get("id").asString());
        assertThat(memberIdsOf(forkId)).containsExactly(travelerIdOf(forker));
        assertThat(roleOf(forkId, travelerIdOf(forker))).isEqualTo("OWNER");
    }


    @Test
    void theWholePlanCrossesFieldByFieldAndTheTitleIsVerbatim() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);

        JsonNode fork = forkOf(freshTraveler(), sourceId);

        assertThat(fork.get("title").asString())
                .as("verbatim — no \"Copy of\" prefix; the copy is the trip the forker just read")
                .isEqualTo("Island Hopping in El Nido");
        assertThat(fork.get("destination").asString()).isEqualTo("Palawan");
        assertThat(fork.get("description").asString())
                .isEqualTo("Discover the breathtaking beauty of El Nido's lagoons.");
        assertThat(fork.get("currency").asString()).isEqualTo("PHP");
        assertThat(fork.get("bestTimeOfYear").asString()).isEqualTo("November to May");
        assertThat(standoutsOf(fork)).containsExactly("Big Lagoon Kayaking", "Sunset at Las Cabanas");

        JsonNode days = fork.get("days");
        assertThat(days.size()).as("every day, in order").isEqualTo(2);
        assertThat(days.get(0).get("ordinal").asInt()).isEqualTo(1);
        assertThat(days.get(0).get("title").asString()).isEqualTo("Arrival and the town proper");
        assertThat(days.get(1).get("ordinal").asInt()).isEqualTo(2);

        JsonNode first = days.get(0).get("activities").get(0);
        assertThat(first.get("title").asString()).isEqualTo("Airport Transfer");
        assertThat(first.get("sortOrder").asInt()).isEqualTo(0);
        assertThat(first.get("timeOfDay").asString()).isEqualTo("14:00");
        assertThat(first.get("costAmount").asString()).isEqualTo("500.00");
        assertThat(first.get("costCurrency").asString()).isEqualTo("PHP");
        assertThat(first.get("place").asString()).isEqualTo("Lio Airport");
        assertThat(first.get("description").asString()).isEqualTo("A van transfer to El Nido town proper.");
        assertThat(first.get("notes").asString())
                .as("Creator Tips cross — words fork, images do not (INV-6 as amended)")
                .isEqualTo("Book the earliest slot at 8:00 AM to avoid the large tour groups!");
        assertThat(first.get("externalUrl").asString()).isEqualTo("https://example.test/transfer");
        assertThat(first.get("bookingPurpose").asString()).isEqualTo("Van transfer");
        assertThat(first.get("bookingProvider").asString()).isEqualTo("Klook");
        assertThat(first.get("bookingPriceAmount").asString()).isEqualTo("1800.00");
        assertThat(first.get("bookingPriceCurrency").asString()).isEqualTo("PHP");

        JsonNode second = days.get(0).get("activities").get(1);
        assertThat(second.get("title").asString()).isEqualTo("Sunset at Las Cabanas");
        assertThat(second.get("sortOrder").asInt())
                .as("the second activity keeps its place behind the first")
                .isEqualTo(1);
    }


    @Test
    void aForkCarriesTHEPINS_becauseAPlanWithoutThemIsAPlanYouMustGeocodeAgain() {
        String author = freshTraveler();
        String sourceId =
                createItinerary(
                        author,
                        """
                        {"title":"Pinned trip","destination":"El Nido, Palawan","durationDays":1}
                        """);
        holdLock(author, sourceId, "{\"subjectType\":\"header\"}");
        rest.patch()
                .uri("/v1/itineraries/" + sourceId)
                .header(HttpHeaders.AUTHORIZATION, bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Pinned trip","destination":"El Nido, Palawan",
                         "pin":{"lat":11.194900,"lng":119.401300,"zoom":12}}
                        """)
                .exchange()
                .expectStatus()
                .isOk();
        releaseLock(author, sourceId, "{\"subjectType\":\"header\"}");
        addActivity(
                author,
                sourceId,
                dayOf(sourceId, 1),
                """
                {"title":"Kayak the lagoon","place":"Big Lagoon",
                 "pin":{"lat":11.178000,"lng":119.389000,"zoom":16}}
                """);
        publish(author, sourceId);

        JsonNode fork = forkOf(freshTraveler(), sourceId);

        JsonNode tripPin = fork.get("pin");
        assertThat(tripPin.isNull())
                .as("the destination pin is what opens every activity picker in the right region")
                .isFalse();
        assertThat(tripPin.get("lat").asDouble()).isEqualTo(11.1949);
        assertThat(tripPin.get("zoom").asInt()).isEqualTo(12);

        JsonNode activityPin = fork.get("days").get(0).get("activities").get(0).get("pin");
        assertThat(activityPin.isNull())
                .as("a forked plan whose pins were dropped is a plan the forker must geocode again")
                .isFalse();
        assertThat(activityPin.get("lat").asDouble()).isEqualTo(11.178);
        assertThat(activityPin.get("lng").asDouble()).isEqualTo(119.389);
        assertThat(activityPin.get("zoom").asInt()).isEqualTo(16);
    }


    @Test
    void theExclusionsAreAssertedRatherThanAssumed() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String forker = freshTraveler();
        UUID forkerId = travelerIdOf(forker);

        JsonNode fork = forkOf(forker, sourceId);
        UUID forkId = UUID.fromString(fork.get("id").asString());

        assertThat(fork.get("startDate").isNull()).as("someone else's calendar, ADR-013").isTrue();
        assertThat(fork.get("endDate").isNull()).isTrue();
        assertThat(fork.get("coverImageUrl").isNull()).as("media never crosses — INV-6").isTrue();
        assertThat(fork.get("planVersion").asLong()).as("a fresh plan document").isZero();
        assertThat(fork.get("lastEditedBy").asString())
                .as("last-edited attribution is the forker at fork time, never the author")
                .isEqualTo(forkerId.toString());

        for (JsonNode day : fork.get("days")) {
            for (JsonNode activity : day.get("activities")) {
                assertThat(activity.get("photos").size()).as("no photo on any copied activity").isZero();
                assertThat(activity.get("lastEditedBy").asString()).isEqualTo(forkerId.toString());
            }
        }

        assertThat(countOf("SELECT count(*) FROM activity_history WHERE itinerary_id = ?", forkId))
                .as("the copy starts with an empty history — nothing happened to it yet")
                .isZero();
        assertThat(stampsOf(forkId))
                .as("no publish, start or complete stamp survives the copy")
                .containsExactly(null, null, null);
        assertThat(memberIdsOf(forkId)).hasSize(1);
    }


    @Test
    void theSourceKeepsEverythingTheForkDidNotTake() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        UUID sourceUuid = UUID.fromString(sourceId);

        forkOf(freshTraveler(), sourceId);

        JsonNode source = itinerary(author, sourceId);
        assertThat(source.get("published").asBoolean()).isTrue();
        assertThat(source.get("state").asString()).isEqualTo("completed");
        assertThat(source.get("days").size()).isEqualTo(2);
        assertThat(countOf("SELECT count(*) FROM day WHERE itinerary_id = ?", sourceUuid)).isEqualTo(2);
    }


    @Test
    void theActWritesOneRelationshipRowNamingSourceAndCopy() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);

        JsonNode fork = forkOf(freshTraveler(), sourceId);
        UUID forkId = UUID.fromString(fork.get("id").asString());

        assertThat(
                        jdbc.queryForObject(
                                "SELECT source_itinerary_id FROM fork_relationship WHERE forked_itinerary_id = ?",
                                UUID.class,
                                forkId))
                .isEqualTo(UUID.fromString(sourceId));
        assertThat(
                        jdbc.queryForObject(
                                "SELECT forked_at FROM fork_relationship WHERE forked_itinerary_id = ?",
                                Timestamp.class,
                                forkId))
                .isNotNull();
        assertThat(countOf("SELECT count(*) FROM fork_relationship WHERE forked_itinerary_id = ?", forkId))
                .isEqualTo(1);
    }


    @Test
    void anUnpublishedSourceRefusesWithTheFencesOwn404AndTheCodeIsAsserted() {
        String author = freshTraveler();
        String sourceId = tripWithAPlan(author);

        String refusal = rawBody(fork(freshTraveler(), sourceId).expectStatus().isNotFound());
        String neverExisted =
                rawBody(fork(freshTraveler(), UUID.randomUUID().toString()).expectStatus().isNotFound());

        assertThat(codeIn(refusal))
                .as("two 404s with different codes would pass a status-only assertion in both worlds")
                .isEqualTo(codeIn(neverExisted))
                .isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void anArchivedSourceRefusesEvenThoughItWasPublished() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        act(author, sourceId, "archive");

        String refusal = rawBody(fork(freshTraveler(), sourceId).expectStatus().isNotFound());

        assertThat(codeIn(refusal)).isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void aPrivatelyPublishedSourceForksForCollaboratorsAndRefusesEveryoneElse() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String member = admitMemberTo(sourceId);
        audienceOf(author, sourceId, "private");

        fork(member, sourceId).expectStatus().isCreated();

        String refusal = rawBody(fork(freshTraveler(), sourceId).expectStatus().isNotFound());
        assertThat(codeIn(refusal)).isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void theAuthorAndTheSourcesMembersForkLikeAnybodyElse() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String member = admitMemberTo(sourceId);

        fork(author, sourceId).expectStatus().isCreated();
        fork(member, sourceId).expectStatus().isCreated();

        assertThat(forkCountOf(sourceId)).isEqualTo(2);
    }


    @Test
    void theSameTravelerForkingTwiceGetsTwoIndependentCopiesAndTwoRows() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String forker = freshTraveler();

        String first = forkOf(forker, sourceId).get("id").asString();
        String second = forkOf(forker, sourceId).get("id").asString();

        assertThat(first).as("the server dedupes nothing — a second run is a fresh copy").isNotEqualTo(second);
        assertThat(forkCountOf(sourceId)).isEqualTo(2);
    }


    @Test
    void aForkOfAForkNamesTheItineraryTheTravelerActuallyTapped() {
        String author = freshTraveler();
        String rootId = publishedTripWithAPlan(author);

        String middleForker = freshTraveler();
        String middleId = forkOf(middleForker, rootId).get("id").asString();
        publish(middleForker, middleId);

        String lastForker = freshTraveler();
        JsonNode leaf = forkOf(lastForker, middleId);

        assertThat(leaf.get("forkedFrom").get("sourceItineraryId").asString())
                .as("one hop — credit stays honest and simple regardless of how long the chain is")
                .isEqualTo(middleId);
        assertThat(forkCountOf(rootId)).isEqualTo(1);
        assertThat(forkCountOf(middleId)).isEqualTo(1);
    }


    @Test
    void aVisitorCannotFork() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);

        rest.post()
                .uri("/v1/itineraries/" + sourceId + "/fork")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }


    @Test
    void unpublishingTheSourceDeletesNobodysFork() {
        String author = freshTraveler();
        String sourceId = publishedTripWithAPlan(author);
        String forker = freshTraveler();
        String forkId = forkOf(forker, sourceId).get("id").asString();

        act(author, sourceId, "unpublish");

        assertThat(itinerary(forker, forkId).get("id").asString())
                .as("what others built on my plan stays theirs — ADR-017")
                .isEqualTo(forkId);
        assertThat(forkCountOf(sourceId)).as("and the count never decrements").isEqualTo(1);
    }


    private long forkCountOf(String itineraryId) {
        return countOf(
                "SELECT count(*) FROM fork_relationship WHERE source_itinerary_id = ?",
                UUID.fromString(itineraryId));
    }


    private long countOf(String sql, UUID id) {
        return jdbc.queryForObject(sql, Long.class, id);
    }


    private List<UUID> memberIdsOf(UUID itineraryId) {
        return jdbc.queryForList(
                "SELECT m.traveler_id FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                        + "WHERE w.itinerary_id = ?",
                UUID.class,
                itineraryId);
    }


    private String roleOf(UUID itineraryId, UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT m.role FROM membership m JOIN workspace w ON m.workspace_id = w.id "
                        + "WHERE w.itinerary_id = ? AND m.traveler_id = ?",
                String.class,
                itineraryId,
                travelerId);
    }


    private List<Timestamp> stampsOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT started_at, completed_at, published_at FROM itinerary WHERE id = ?",
                (row, index) ->
                        java.util.Arrays.asList(
                                row.getTimestamp("started_at"),
                                row.getTimestamp("completed_at"),
                                row.getTimestamp("published_at")),
                itineraryId);
    }


    private static List<String> standoutsOf(JsonNode itinerary) {
        List<String> found = new ArrayList<>();
        itinerary.get("standouts").forEach(standout -> found.add(standout.asString()));
        return found;
    }


    private JsonNode forkOf(String token, String sourceId) {
        return JSON.readTree(rawBody(fork(token, sourceId).expectStatus().isCreated()));
    }


    private RestTestClient.ResponseSpec fork(String token, String sourceId) {
        return rest.post()
                .uri("/v1/itineraries/" + sourceId + "/fork")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }


    private JsonNode itinerary(String token, String itineraryId) {
        return JSON.readTree(
                rawBody(
                        rest.get()
                                .uri("/v1/itineraries/" + itineraryId)
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()));
    }


    private String publishedTripWithAPlan(String token) {
        String tripId = tripWithAPlan(token);
        publish(token, tripId);
        return tripId;
    }


    private String tripWithAPlan(String token) {
        String tripId =
                createItinerary(
                        token,
                        """
                        {"title":"Island Hopping in El Nido","destination":"Palawan",
                         "description":"Discover the breathtaking beauty of El Nido's lagoons.",
                         "startDate":"2027-03-04","endDate":"2027-03-08","durationDays":2}
                        """);
        UUID firstDay = dayOf(tripId, 1);
        holdLock(token, tripId, "{\"subjectType\":\"day\",\"subjectId\":\"" + firstDay + "\"}");
        renameDay(token, tripId, firstDay, "Arrival and the town proper");
        releaseLock(token, tripId, "{\"subjectType\":\"day\",\"subjectId\":\"" + firstDay + "\"}");
        addActivity(
                token,
                tripId,
                dayOf(tripId, 1),
                """
                {"title":"Airport Transfer","timeOfDay":"14:00","costAmount":"500","costCurrency":"PHP",
                 "place":"Lio Airport","description":"A van transfer to El Nido town proper.",
                 "notes":"Book the earliest slot at 8:00 AM to avoid the large tour groups!",
                 "externalUrl":"https://example.test/transfer",
                 "bookingPurpose":"Van transfer","bookingProvider":"Klook",
                 "bookingPriceAmount":"1800","bookingPriceCurrency":"PHP"}
                """);
        addActivity(token, tripId, dayOf(tripId, 1), """
                {"title":"Sunset at Las Cabanas","costAmount":"300","costCurrency":"PHP"}
                """);
        describe(token, tripId);
        return tripId;
    }


    private void describe(String token, String tripId) {
        holdLock(token, tripId, "{\"subjectType\":\"header\"}");
        patchDetails(token, tripId);
        releaseLock(token, tripId, "{\"subjectType\":\"header\"}");
    }


    private void holdLock(String token, String tripId, String subject) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(subject)
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void releaseLock(String token, String tripId, String subject) {
        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(subject)
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void patchDetails(String token, String tripId) {
        rest.patch()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        """
                        {"title":"Island Hopping in El Nido","destination":"Palawan",
                         "bestTimeOfYear":"November to May",
                         "standouts":["Big Lagoon Kayaking","Sunset at Las Cabanas"]}
                        """)
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void renameDay(String token, String tripId, UUID dayId, String title) {
        rest.patch()
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"" + title + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void addActivity(String token, String itineraryId, UUID dayId, String body) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/days/" + dayId + "/activities")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private UUID dayOf(String itineraryId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = ?",
                UUID.class,
                UUID.fromString(itineraryId),
                ordinal);
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


    private final Set<String> travelled = new HashSet<>();

    private void publish(String token, String itineraryId) {
        if (travelled.add(itineraryId)) {
            act(token, itineraryId, "start");
            act(token, itineraryId, "complete");
        }
        act(token, itineraryId, "publish");
    }


    private void audienceOf(String token, String itineraryId, String audience) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/audience")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"" + audience + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void act(String token, String itineraryId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String createItinerary(String token, String body) {
        return JSON.readTree(
                        new String(
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
                                        .getResponseBodyContent()))
                .get("id")
                .asString();
    }


    private UUID travelerIdOf(String token) {
        return UUID.fromString(
                JSON.readTree(
                                new String(
                                        rest.get()
                                                .uri("/v1/me")
                                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                                .exchange()
                                                .expectStatus()
                                                .isOk()
                                                .expectBody()
                                                .returnResult()
                                                .getResponseBodyContent()))
                        .get("id")
                        .asString());
    }


    private static String codeIn(String errorBody) {
        return JSON.readTree(errorBody).get("code").asString();
    }


    private static String rawBody(RestTestClient.ResponseSpec spec) {
        return new String(spec.expectBody().returnResult().getResponseBodyContent());
    }


    private static String freshTraveler() {
        return TestJwtSupport.tokenFor(
                "uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
