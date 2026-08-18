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


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryMergePatchIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final String FULLY_DRESSED =
            """
            {"title":"Boracay Barkada Trip","destination":"Boracay","description":"One week of beach.",
             "bestTimeOfYear":"March–May","standouts":["Sunset paraw sailing"],
             "startDate":"2027-03-12","endDate":"2027-03-19","durationDays":2}
            """;


    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void anAbsentFieldKeepsItsValueWhileAnExplicitNullClearsIt() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        lock(owner, tripId);

        patch(owner, tripId, """
                {"title":"Boracay Barkada Trip","destination":"Boracay"}
                """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.description")
                .isEqualTo("One week of beach.")
                .jsonPath("$.bestTimeOfYear")
                .isEqualTo("March–May")
                .jsonPath("$.standouts[0]")
                .isEqualTo("Sunset paraw sailing")
                .jsonPath("$.startDate")
                .isEqualTo("2027-03-12")
                .jsonPath("$.endDate")
                .isEqualTo("2027-03-19");

        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","description":null,
                         "bestTimeOfYear":null,"standouts":null,"startDate":null,"endDate":null}
                        """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.description")
                .doesNotExist()
                .jsonPath("$.bestTimeOfYear")
                .doesNotExist()
                .jsonPath("$.standouts")
                .isEmpty()
                .jsonPath("$.startDate")
                .doesNotExist()
                .jsonPath("$.endDate")
                .doesNotExist();
    }


    @Test
    void clearingOneDateLeavesTheOtherStanding() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        lock(owner, tripId);

        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","startDate":null}
                        """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.startDate")
                .doesNotExist()
                .jsonPath("$.endDate")
                .isEqualTo("2027-03-19");
    }


    @Test
    void aNullTitleIsRefusedRatherThanClearingIt() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        lock(owner, tripId);

        patch(owner, tripId, """
                {"title":null,"destination":"Boracay"}
                """)
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void aNullDestinationIsRefusedRatherThanClearingIt() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        lock(owner, tripId);

        patch(owner, tripId, """
                {"title":"Boracay Barkada Trip","destination":null}
                """)
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void theCurrencyIsReplaceOnly() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        lock(owner, tripId);

        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","currency":"THB"}
                        """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.currency")
                .isEqualTo("THB");

        patch(owner, tripId, """
                {"title":"Boracay Barkada Trip","destination":"Boracay"}
                """)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.currency")
                .isEqualTo("THB");

        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","currency":null}
                        """)
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void aNewTripIsBornAPesoTrip() {
        String owner = freshTraveler();

        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Someday","destination":"Sapporo"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.currency")
                .isEqualTo("PHP");
    }


    @Test
    void aCollaboratorsDetailsEditIsRefusedWhileTheSameTravelersPlanWriteSucceeds() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        String member = admitMemberTo(tripId);

        lock(member, tripId);
        byte[] refusal =
                patch(member, tripId, """
                        {"title":"Hijacked","destination":"Boracay"}
                        """)
                        .expectStatus()
                        .isForbidden()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(codeIn(refusal))
                .as("a collaborator's details edit is refused with the owner-act code")
                .isEqualTo("NOT_PERMITTED");

        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId + "/activities")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Sunset paraw sailing"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated();
    }


    @Test
    void changingTheCurrencyRelabelsEveryPricedActivityAndLeavesTheRestAlone() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));

        addActivity(owner, tripId, dayId, "Paraw sailing", "1500.00", "PHP");
        addActivity(owner, tripId, dayId, "Beach walk", null, null);

        lock(owner, tripId);
        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","currency":"USD"}
                        """)
                .expectStatus()
                .isOk();

        assertThat(
                        jdbc.queryForList(
                                "SELECT a.cost_currency FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NOT NULL",
                                String.class,
                                UUID.fromString(tripId)))
                .as("every priced activity carries the trip's new currency")
                .containsExactly("USD");

        assertThat(
                        jdbc.queryForList(
                                "SELECT count(*) FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NULL "
                                        + "AND a.cost_currency IS NOT NULL",
                                Long.class,
                                UUID.fromString(tripId)))
                .as("an unpriced activity gains no currency out of nowhere")
                .containsExactly(0L);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT a.cost_amount::text FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NOT NULL",
                                String.class,
                                UUID.fromString(tripId)))
                .as("the numbers are untouched — labels swap, no FX ever")
                .isEqualTo("1500.00");
    }


    @Test
    void aFailedRelabelTakesTheTripsOwnCurrencyDownWithIt() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));
        addActivity(owner, tripId, dayId, "Paraw sailing", "1500.00", "PHP");
        addActivity(owner, tripId, dayId, "Island hopping", "2500.00", "PHP");

        jdbc.execute(
                "CREATE OR REPLACE FUNCTION largata_test_block_relabel() RETURNS trigger AS $$ "
                        + "BEGIN RAISE EXCEPTION 'relabel blocked mid-flight'; END; $$ LANGUAGE plpgsql");
        jdbc.execute(
                "CREATE TRIGGER largata_test_relabel_guard BEFORE UPDATE OF cost_currency ON activity "
                        + "FOR EACH ROW EXECUTE FUNCTION largata_test_block_relabel()");
        try {
            lock(owner, tripId);
            patch(
                            owner,
                            tripId,
                            """
                            {"title":"Boracay Barkada Trip","destination":"Boracay","currency":"USD"}
                            """)
                    .expectStatus()
                    .is5xxServerError();
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS largata_test_relabel_guard ON activity");
            jdbc.execute("DROP FUNCTION IF EXISTS largata_test_block_relabel()");
        }

        assertThat(
                        jdbc.queryForList(
                                "SELECT a.cost_currency FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NOT NULL",
                                String.class,
                                UUID.fromString(tripId)))
                .as("zero rows relabelled when the relabel dies part way")
                .containsExactly("PHP", "PHP");

        assertThat(
                        jdbc.queryForObject(
                                "SELECT currency FROM itinerary WHERE id = ?",
                                String.class,
                                UUID.fromString(tripId)))
                .as("…and the trip's own currency rolled back with them — all or none")
                .isEqualTo("PHP");
    }


    @Test
    void aRefusedDetailsEditRelabelsNothing() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));
        addActivity(owner, tripId, dayId, "Paraw sailing", "1500.00", "PHP");

        lock(owner, tripId);
        patch(owner, tripId, """
                {"title":"   ","destination":"Boracay","currency":"USD"}
                """)
                .expectStatus()
                .isBadRequest();

        assertThat(
                        jdbc.queryForList(
                                "SELECT a.cost_currency FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NOT NULL",
                                String.class,
                                UUID.fromString(tripId)))
                .as("a rejected save relabels nothing — all or none")
                .containsExactly("PHP");
    }


    @Test
    void savingAnActivityStampsTheTripsCurrencyIntoIt() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));

        lock(owner, tripId);
        patch(
                        owner,
                        tripId,
                        """
                        {"title":"Boracay Barkada Trip","destination":"Boracay","currency":"THB"}
                        """)
                .expectStatus()
                .isOk();

        addActivity(owner, tripId, dayId, "Boat noodles", "120.00", "PHP");

        assertThat(
                        jdbc.queryForList(
                                "SELECT a.cost_currency FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_amount IS NOT NULL",
                                String.class,
                                UUID.fromString(tripId)))
                .as("a client that sends its own currency is overruled by the trip's")
                .containsExactly("THB");
    }


    @Test
    void anUnpricedActivityGainsNoCurrencyFromTheTrip() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);
        UUID dayId =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        UUID.fromString(tripId));

        addActivity(owner, tripId, dayId, "Beach walk", null, null);

        assertThat(
                        jdbc.queryForList(
                                "SELECT count(*) FROM activity a JOIN day d ON d.id = a.day_id "
                                        + "WHERE d.itinerary_id = ? AND a.cost_currency IS NOT NULL",
                                Long.class,
                                UUID.fromString(tripId)))
                .as("the pairing invariant holds — no currency without an amount")
                .containsExactly(0L);
    }


    @Test
    void theDetailsEditStillNeedsTheHeaderLease() {
        String owner = freshTraveler();
        String tripId = createDressedTrip(owner);

        patch(owner, tripId, """
                {"title":"Renamed without a lease","destination":"Boracay"}
                """)
                .expectStatus()
                .isEqualTo(409);
    }


    private RestTestClient.ResponseSpec patch(String token, String itineraryId, String body) {
        return rest.patch()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }


    private void addActivity(
            String token, String tripId, UUID dayId, String title, String amount, String currency) {
        String money =
                amount == null
                        ? ""
                        : ",\"costAmount\":\"" + amount + "\",\"costCurrency\":\"" + currency + "\"";
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/days/" + dayId + "/activities")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"" + title + "\"" + money + "}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void lock(String token, String itineraryId) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        UUID memberId = travelerIdOf(memberToken);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?",
                        UUID.class,
                        UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                memberId,
                Timestamp.from(Instant.now()));
        return memberToken;
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


    private String createDressedTrip(String token) {
        return fieldIn(
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(FULLY_DRESSED)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private static String fieldIn(byte[] body, String field) {
        String json = new String(body, java.nio.charset.StandardCharsets.UTF_8);
        int at = json.indexOf("\"" + field + "\"");
        int start = json.indexOf('"', json.indexOf(':', at)) + 1;
        return json.substring(start, json.indexOf('"', start));
    }


    private static String codeIn(byte[] body) {
        return fieldIn(body, "code");
    }


    private static String freshTraveler() {
        String uid = "uid-" + UUID.randomUUID();
        return TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
