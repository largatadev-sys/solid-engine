package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
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
class ForkProvenanceIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aForkedTripCarriesForkedFromWhileAScratchTripCarriesNull() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();

        JsonNode provenance = itinerary(forker, forkId).get("forkedFrom");
        assertThat(provenance.isNull()).isFalse();
        assertThat(provenance.get("sourceItineraryId").asString()).isEqualTo(sourceId);

        String scratchId = trip(forker);
        assertThat(itinerary(forker, scratchId).get("forkedFrom").isNull())
                .as("a trip nobody forked names no origin — existing clients are unaffected")
                .isTrue();
    }


    @Test
    void theTripsListStaysTheThinCardProjectionAndResolvesNoProvenance() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();
        String forkId = forkOf(forker, sourceId).get("id").asString();

        JsonNode card =
                JSON.readTree(
                                rawBody(
                                        rest.get()
                                                .uri("/v1/itineraries")
                                                .header(HttpHeaders.AUTHORIZATION, bearer(forker))
                                                .exchange()
                                                .expectStatus()
                                                .isOk()))
                        .get("items")
                        .valueStream()
                        .filter(item -> item.get("id").asString().equals(forkId))
                        .findFirst()
                        .orElseThrow();

        assertThat(card.get("forkedFrom").isNull())
                .as("the card projection resolves no per-row provenance, for the same reason it "
                        + "carries no days, no lease and no editor — nothing on a Trips card renders it, "
                        + "and a lookup per row would buy a query per page for nothing drawn")
                .isTrue();
        assertThat(card.get("days").size()).isZero();
        assertThat(card.get("lease").isNull()).isTrue();

        assertThat(itinerary(forker, forkId).get("forkedFrom").get("sourceItineraryId").asString())
                .as("the full read model is where provenance lives, and it has it")
                .isEqualTo(sourceId);
    }


    @Test
    void ownerHandleResolvesLiveFromTheSourcesCurrentOwner() {
        String handle = "josetravels" + suffix();
        String author = travelerWithHandle(handle);
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();

        assertThat(itinerary(forker, forkId).get("forkedFrom").get("ownerHandle").asString())
                .isEqualTo(handle);

        String renamed = "jose" + suffix();
        setHandle(author, renamed);

        assertThat(itinerary(forker, forkId).get("forkedFrom").get("ownerHandle").asString())
                .as("resolved at read time, never stored as copied text — it survives a rename")
                .isEqualTo(renamed);
    }


    @Test
    void aHandlelessAuthorLeavesTheHandleNullRatherThanLeakingADisplayName() {
        String author = TestJwtSupport.tokenWithName(
                "uid-" + UUID.randomUUID(), "author-" + UUID.randomUUID() + "@example.com", "Jose Reyes");
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();
        JsonNode provenance = itinerary(forker, forkId).get("forkedFrom");

        assertThat(provenance.get("ownerHandle").isNull())
                .as("the client renders \"a traveler\"; the display name never reaches a fork surface")
                .isTrue();
        assertThat(rawItinerary(forker, forkId)).doesNotContain("Jose Reyes");
    }


    @Test
    void sourceVisibleFollowsTheFenceAsTheSourceIsUnpublishedAndRepublished() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();
        assertThat(sourceVisibleOn(forker, forkId)).isTrue();

        act(author, sourceId, "unpublish");
        assertThat(sourceVisibleOn(forker, forkId))
                .as("the pill falls back to plain text rather than dead-clicking into a 404")
                .isFalse();

        act(author, sourceId, "publish");
        assertThat(sourceVisibleOn(forker, forkId)).isTrue();

        act(author, sourceId, "archive");
        assertThat(sourceVisibleOn(forker, forkId)).isFalse();
    }


    @Test
    void aPrivateSourceIsVisibleToItsMembersAndNotToTheStrangerWhoForkedIt() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);
        String stranger = freshTraveler();
        String forkByStranger = forkOf(stranger, sourceId).get("id").asString();

        String member = admitMemberTo(sourceId);
        String forkByMember = forkOf(member, sourceId).get("id").asString();

        audienceOf(author, sourceId, "private");

        assertThat(sourceVisibleOn(stranger, forkByStranger)).isFalse();
        assertThat(sourceVisibleOn(member, forkByMember))
                .as("the fence answers per reader, so the same source is visible to a collaborator")
                .isTrue();
    }


    @Test
    void theProjectionOfAForkCarriesTheSameAttributionOntoItsPublicFace() {
        String handle = "josetravels" + suffix();
        String author = travelerWithHandle(handle);
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();
        publish(forker, forkId);

        JsonNode provenance = publicView(freshTraveler(), forkId).get("forkedFrom");
        assertThat(provenance.get("sourceItineraryId").asString()).isEqualTo(sourceId);
        assertThat(provenance.get("ownerHandle").asString()).isEqualTo(handle);
        assertThat(provenance.get("sourceVisible").asBoolean()).isTrue();
    }


    @Test
    void theProjectionOfAScratchTripCarriesNoAttributionAtAll() {
        String author = travelerWithHandle("solo" + suffix());
        String tripId = publishedTrip(author);

        assertThat(publicView(freshTraveler(), tripId).get("forkedFrom").isNull()).isTrue();
    }


    @Test
    void forkCountCountsRowsNamingTheItineraryAsSourceAndNeverDecrements() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);

        assertThat(forkCountOn(freshTraveler(), sourceId)).isZero();

        String firstForkId = forkOf(freshTraveler(), sourceId).get("id").asString();
        assertThat(forkCountOn(freshTraveler(), sourceId)).isEqualTo(1);

        forkOf(freshTraveler(), sourceId);
        assertThat(forkCountOn(freshTraveler(), sourceId)).isEqualTo(2);

        act(author, sourceId, "unpublish");
        act(author, sourceId, "publish");
        assertThat(forkCountOn(freshTraveler(), sourceId))
                .as("unchanged by source unpublish and republish")
                .isEqualTo(2);

        deleteEveryDayOf(firstForkId);
        assertThat(forkCountOn(freshTraveler(), sourceId))
                .as("unchanged by what the copy later becomes — the fork happened")
                .isEqualTo(2);
    }


    @Test
    void theCountIsTheSourcesOwnAndAForkStartsAtZero() {
        String author = travelerWithHandle("josetravels" + suffix());
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        String forkId = forkOf(forker, sourceId).get("id").asString();
        publish(forker, forkId);

        assertThat(forkCountOn(freshTraveler(), sourceId)).isEqualTo(1);
        assertThat(forkCountOn(freshTraveler(), forkId))
                .as("nobody has forked the copy yet")
                .isZero();
    }


    private boolean sourceVisibleOn(String token, String forkId) {
        return itinerary(token, forkId).get("forkedFrom").get("sourceVisible").asBoolean();
    }


    private long forkCountOn(String token, String itineraryId) {
        return publicView(token, itineraryId).get("forkCount").asLong();
    }


    private void deleteEveryDayOf(String itineraryId) {
        jdbc.update(
                "DELETE FROM activity WHERE day_id IN (SELECT id FROM day WHERE itinerary_id = ?)",
                UUID.fromString(itineraryId));
        jdbc.update("DELETE FROM day WHERE itinerary_id = ?", UUID.fromString(itineraryId));
    }


    private JsonNode publicView(String token, String itineraryId) {
        return JSON.readTree(
                rawBody(
                        rest.get()
                                .uri("/v1/published-itineraries/" + itineraryId)
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()));
    }


    private JsonNode forkOf(String token, String sourceId) {
        return JSON.readTree(
                rawBody(
                        rest.post()
                                .uri("/v1/itineraries/" + sourceId + "/fork")
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isCreated()));
    }


    private JsonNode itinerary(String token, String itineraryId) {
        return JSON.readTree(rawItinerary(token, itineraryId));
    }


    private String rawItinerary(String token, String itineraryId) {
        return rawBody(
                rest.get()
                        .uri("/v1/itineraries/" + itineraryId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk());
    }


    private String publishedTrip(String token) {
        String tripId = trip(token);
        publish(token, tripId);
        return tripId;
    }


    private String trip(String token) {
        return JSON.readTree(
                        new String(
                                rest.post()
                                        .uri("/v1/itineraries")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(
                                                """
                                                {"title":"Island Hopping in El Nido",
                                                 "destination":"Palawan","durationDays":2}
                                                """)
                                        .exchange()
                                        .expectStatus()
                                        .isCreated()
                                        .expectBody()
                                        .returnResult()
                                        .getResponseBodyContent()))
                .get("id")
                .asString();
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


    private String travelerWithHandle(String handle) {
        String token = freshTraveler();
        setHandle(token, handle);
        return token;
    }


    private void setHandle(String token, String handle) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
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


    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 8).replace("-", "");
    }


    private static String rawBody(RestTestClient.ResponseSpec spec) {
        return new String(spec.expectBody().returnResult().getResponseBodyContent());
    }


    private static String freshTraveler() {
        return TestJwtSupport.verifiedToken(
                "uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
