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
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class AudienceLadderIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void archivingTakesTheTripOutOfEveryMemberListWhileTheOwnerKeepsItBadged() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        assertThat(tripIdsIn(activeList(member))).contains(tripId);

        act(owner, tripId, "archive");

        assertThat(tripIdsIn(activeList(member))).doesNotContain(tripId);
        assertThat(tripIdsIn(archivedList(member)))
                .as("archived is owner-only sight, so the archived tab is empty for a member too")
                .doesNotContain(tripId);

        assertThat(tripIdsIn(activeList(owner))).doesNotContain(tripId);
        assertThat(tripIdsIn(archivedList(owner))).contains(tripId);
        archivedList(owner).expectBody().jsonPath("$.items[0].archived").isEqualTo(true);
    }


    @Test
    void aMembersDirectReadOfAnArchivedTripIsMaskedWhileTheOwnersIsServed() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        view(member, tripId).expectStatus().isOk();

        act(owner, tripId, "archive");

        view(member, tripId).expectStatus().isNotFound().expectBody().jsonPath("$.code").isEqualTo("ITINERARY_NOT_FOUND");
        members(member, tripId).expectStatus().isNotFound();
        invitations(member, tripId).expectStatus().isNotFound();
        view(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.archived").isEqualTo(true);
        members(owner, tripId).expectStatus().isOk();
        invitations(owner, tripId).expectStatus().isOk();
    }


    @Test
    void aMembersDiaryReadsOnAnArchivedTripAreMaskedWhileTheOwnersAreServed() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        diaryList(member, tripId).expectStatus().isOk();

        act(owner, tripId, "archive");

        diaryList(member, tripId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");

        diaryEntry(member, tripId, UUID.randomUUID())
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");

        diaryList(owner, tripId).expectStatus().isOk();
        diaryEntry(owner, tripId, UUID.randomUUID())
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_ENTRY_NOT_FOUND");
    }


    @Test
    void unarchivingRestoresTheMembersListRowAndTheirReadsUntouched() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        act(owner, tripId, "archive");
        act(owner, tripId, "unarchive");

        assertThat(tripIdsIn(activeList(member))).contains(tripId);
        view(member, tripId).expectStatus().isOk();
        members(member, tripId).expectStatus().isOk();
        diaryList(member, tripId).expectStatus().isOk();
    }


    @Test
    void theMembershipSurvivesTheArchiveEvenThoughTheMemberCannotSeeIt() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        UUID memberId = travelerIdOf(member);

        act(owner, tripId, "archive");

        assertThat(membershipRowsFor(tripId, memberId))
                .as("hidden, never deleted — unarchive restores a working trip")
                .isEqualTo(1);
    }


    @Test
    void selfLeaveStaysPermittedOnTheWireWhileTheTripIsHiddenFromTheMember() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        UUID memberId = travelerIdOf(member);

        act(owner, tripId, "archive");
        view(member, tripId).expectStatus().isNotFound();

        rest.delete()
                .uri("/v1/itineraries/" + tripId + "/members/" + memberId)
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(membershipRowsFor(tripId, memberId)).isZero();
    }


    @Test
    void aPublishedThenArchivedTripDisappearsForEverybodyAndComesBackOnUnarchive() {
        String owner = freshTraveler();
        String consumer = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        act(owner, tripId, "start");
        act(owner, tripId, "complete");
        act(owner, tripId, "publish");

        publicView(consumer, tripId).expectStatus().isOk();

        act(owner, tripId, "archive");

        publicView(consumer, tripId).expectStatus().isNotFound();
        view(member, tripId).expectStatus().isNotFound();
        view(owner, tripId).expectStatus().isOk();

        act(owner, tripId, "unarchive");

        publicView(consumer, tripId).expectStatus().isOk();
        view(member, tripId).expectStatus().isOk();
    }


    private RestTestClient.ResponseSpec view(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec members(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec invitations(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec diaryList(String token, String itineraryId) {
        return list(token, "/v1/itineraries/" + itineraryId + "/diary/entries");
    }

    private RestTestClient.ResponseSpec diaryEntry(String token, String itineraryId, UUID entryId) {
        return list(token, "/v1/itineraries/" + itineraryId + "/diary/entries/" + entryId);
    }

    private RestTestClient.ResponseSpec publicView(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/published-itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec activeList(String token) {
        return list(token, "/v1/itineraries");
    }

    private RestTestClient.ResponseSpec archivedList(String token) {
        return list(token, "/v1/itineraries?archived=true");
    }

    private RestTestClient.ResponseSpec list(String token, String uri) {
        return rest.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private static java.util.List<String> tripIdsIn(RestTestClient.ResponseSpec spec) {
        var items =
                JSON.readTree(new String(spec.expectBody().returnResult().getResponseBodyContent())).get("items");
        java.util.List<String> ids = new java.util.ArrayList<>();
        items.forEach(item -> ids.add(item.get("id").asString()));
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

    private int membershipRowsFor(String itineraryId, UUID travelerId) {
        Integer count =
                jdbc.queryForObject(
                        "SELECT count(*) FROM membership m JOIN workspace w ON w.id = m.workspace_id "
                                + "WHERE w.itinerary_id = ? AND m.traveler_id = ?",
                        Integer.class,
                        UUID.fromString(itineraryId),
                        travelerId);
        return count == null ? 0 : count;
    }

    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                travelerIdOf(memberToken),
                Timestamp.from(Instant.now()));
        return memberToken;
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

    private String createItinerary(String token) {
        return JSON.readTree(
                        new String(
                                rest.post()
                                        .uri("/v1/itineraries")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body("""
                                                {"title":"Island Hopping","destination":"Palawan"}
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

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
