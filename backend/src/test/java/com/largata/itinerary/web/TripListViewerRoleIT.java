package com.largata.itinerary.web;

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


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripListViewerRoleIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theOwnersRowSaysOwnerAndCarriesTheMemberCount() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner, "Owned trip");
        admitMemberTo(tripId);
        admitMemberTo(tripId);

        list(owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].viewerRole")
                .isEqualTo("owner")
                .jsonPath("$.items[0].memberCount")
                .isEqualTo(3);
    }


    @Test
    void aMembersRowSaysMemberOnTheSameTrip() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner, "Shared trip");
        String member = admitMemberTo(tripId);

        list(member)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].viewerRole")
                .isEqualTo("member")
                .jsonPath("$.items[0].memberCount")
                .isEqualTo(2);
    }


    @Test
    void aFreshSoloTripCountsItsOwnerAsItsOnlyMember() {
        String owner = freshTraveler();
        createItinerary(owner, "Solo trip");

        list(owner)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].viewerRole")
                .isEqualTo("owner")
                .jsonPath("$.items[0].memberCount")
                .isEqualTo(1);
    }


    @Test
    void theRolesAreResolvedPerRowNotPerRequest() {
        String traveler = freshTraveler();
        createItinerary(traveler, "Mine");
        String othersTrip = createItinerary(freshTraveler(), "Theirs");
        admitTokenTo(othersTrip, traveler);

        list(traveler)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].title")
                .isEqualTo("Theirs")
                .jsonPath("$.items[0].viewerRole")
                .isEqualTo("member")
                .jsonPath("$.items[1].title")
                .isEqualTo("Mine")
                .jsonPath("$.items[1].viewerRole")
                .isEqualTo("owner");
    }


    private RestTestClient.ResponseSpec list(String token) {
        return rest.get()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private String createItinerary(String token, String title) {
        return fieldIn(
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"%s","destination":"Somewhere"}
                                """.formatted(title))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }

    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        admitTokenTo(itineraryId, memberToken);
        return memberToken;
    }

    private void admitTokenTo(String itineraryId, String memberToken) {
        UUID memberId = travelerIdOf(memberToken);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                memberId,
                Timestamp.from(Instant.now()));
    }

    private UUID travelerIdOf(String token) {
        return UUID.fromString(
                fieldIn(
                        rest.get()
                                .uri("/v1/me")
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id"));
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int at = json.indexOf(needle);
        int start = at + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "roles@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
