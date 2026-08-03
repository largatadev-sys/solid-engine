package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
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
class PublishMetadataIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void anExistingItineraryReadsAsEmptyMetadataAndPublishesWithoutArtifacts() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        view(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.standouts.length()")
                .isEqualTo(0)
                .jsonPath("$.bestTimeOfYear")
                .doesNotExist()
                .jsonPath("$.coverImageUrl")
                .doesNotExist();

        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.standouts.length()")
                .isEqualTo(0)
                .jsonPath("$.bestTimeOfYear")
                .doesNotExist()
                .jsonPath("$.coverImageUrl")
                .doesNotExist();
    }


    @Test
    void theCreatorEntersStandoutsAndBestTimeUnderTheHeaderLeaseAndTheyReachTheProjection() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        acquireHeaderLease(owner, tripId);

        editHeader(
                        owner,
                        tripId,
                        """
                        {"title":"Island Hopping in El Nido","destinations":["Palawan"],
                         "standouts":["Big Lagoon Kayaking","Local Seafood Dinners"],
                         "bestTimeOfYear":"Dec – Apr"}
                        """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.standouts")
                .isEqualTo(List.of("Big Lagoon Kayaking", "Local Seafood Dinners"))
                .jsonPath("$.bestTimeOfYear")
                .isEqualTo("Dec – Apr");

        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.standouts")
                .isEqualTo(List.of("Big Lagoon Kayaking", "Local Seafood Dinners"))
                .jsonPath("$.bestTimeOfYear")
                .isEqualTo("Dec – Apr");
    }


    @Test
    void theStandoutsOrderIsTheCreatorsAndSurvivesAReorder() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        acquireHeaderLease(owner, tripId);

        editHeader(owner, tripId, """
                {"title":"Trip","destinations":["Palawan"],"standouts":["One","Two","Three"]}
                """)
                .expectStatus()
                .isOk();
        editHeader(owner, tripId, """
                {"title":"Trip","destinations":["Palawan"],"standouts":["Three","One"]}
                """)
                .expectStatus()
                .isOk();

        view(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.standouts")
                .isEqualTo(List.of("Three", "One"));
        assertThat(standoutsOf(tripId)).containsExactly("Three", "One");
    }


    @Test
    void metadataIsHeaderLeaseTerritorySoAConcurrentHeaderEditIsRejected() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        acquireHeaderLease(member, tripId);

        editHeader(owner, tripId, """
                {"title":"Trip","destinations":["Palawan"],"standouts":["Mine"]}
                """)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");

        assertThat(standoutsOf(tripId)).isEmpty();
    }


    @Test
    void aBlankStandoutRowIsDroppedRatherThanStoredAsAnEmptySellingPoint() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        acquireHeaderLease(owner, tripId);

        editHeader(owner, tripId, """
                {"title":"Trip","destinations":["Palawan"],"standouts":["  Kayaking  ","","   "]}
                """)
                .expectStatus()
                .isOk();

        assertThat(standoutsOf(tripId)).containsExactly("Kayaking");
    }


    @Test
    void theCoverFieldShipsWithNoWriterAtAllSoItStaysNullThroughAHeaderEdit() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        acquireHeaderLease(owner, tripId);

        editHeader(
                        owner,
                        tripId,
                        """
                        {"title":"Trip","destinations":["Palawan"],"coverImageUrl":"https://example.test/x.jpg"}
                        """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.coverImageUrl")
                .doesNotExist();

        assertThat(coverOf(tripId)).isNull();
    }


    private RestTestClient.ResponseSpec editHeader(String token, String itineraryId, String body) {
        return rest.patch()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private void acquireHeaderLease(String token, String itineraryId) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private RestTestClient.ResponseSpec view(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec publicView(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/published-itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private void publish(String token, String itineraryId) {
        act(token, itineraryId, "start");
        act(token, itineraryId, "complete");
        act(token, itineraryId, "publish");
    }

    private void act(String token, String itineraryId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private List<String> standoutsOf(String itineraryId) {
        String[] stored =
                (String[])
                        jdbc.queryForObject(
                                "SELECT standouts FROM itinerary WHERE id = ?",
                                (rs, row) -> rs.getArray("standouts").getArray(),
                                UUID.fromString(itineraryId));
        return List.of(stored);
    }

    private String coverOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT cover_image_url FROM itinerary WHERE id = ?", String.class, UUID.fromString(itineraryId));
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
                                                {"title":"Trip","destinations":["Palawan"]}
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
