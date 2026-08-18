package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class OwnershipTransferIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void acceptingAnOfferSwapsRolesSyncsTheItineraryAndRecordsTheTransfer() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID formerOwnerId = travelerIdOf(ownerToken);
        UUID newOwnerId = travelerIdOf(memberToken);
        offer(ownerToken, trip, newOwnerId).expectStatus().isCreated();

        accept(memberToken, trip).expectStatus().isNoContent();

        assertThat(roleOnRoster(ownerToken, trip, newOwnerId)).isEqualTo("owner");
        assertThat(roleOnRoster(ownerToken, trip, formerOwnerId)).isEqualTo("member");

        assertThat(ownerIdColumnOf(trip)).isEqualTo(newOwnerId);

        List<Map<String, Object>> transfers = transfersFor(trip);
        assertThat(transfers).hasSize(1);
        assertThat(transfers.getFirst().get("from_traveler_id")).isEqualTo(formerOwnerId);
        assertThat(transfers.getFirst().get("to_traveler_id")).isEqualTo(newOwnerId);

        assertThat(offerStatusesFor(trip)).containsExactly("ACCEPTED");
        accept(memberToken, trip).expectStatus().isNotFound();
    }

    @Test
    void theFormerOwnerKeepsTheirMembershipAndCanNowLeave() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID formerOwnerId = travelerIdOf(ownerToken);
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        depart(ownerToken, trip, formerOwnerId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");

        accept(memberToken, trip).expectStatus().isNoContent();

        depart(ownerToken, trip, formerOwnerId).expectStatus().isNoContent();
        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void theNewOwnerInheritsOwnerAuthorityAndTheFormerOwnerLosesIt() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String thirdToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();
        accept(memberToken, trip).expectStatus().isNoContent();

        offer(ownerToken, trip, travelerIdOf(thirdToken))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        offer(memberToken, trip, travelerIdOf(thirdToken)).expectStatus().isCreated();
    }

    @Test
    void ownershipCanTravelBackAndTheChainRecordsBothHops() {
        String aliceToken = verified(uniqueEmail());
        String trip = createTrip(aliceToken);
        String bobToken = joinAsMember(aliceToken, trip, uniqueEmail());
        UUID alice = travelerIdOf(aliceToken);
        UUID bob = travelerIdOf(bobToken);

        offer(aliceToken, trip, bob).expectStatus().isCreated();
        accept(bobToken, trip).expectStatus().isNoContent();
        offer(bobToken, trip, alice).expectStatus().isCreated();
        accept(aliceToken, trip).expectStatus().isNoContent();

        List<Map<String, Object>> chain = transfersFor(trip);
        assertThat(chain).hasSize(2);
        assertThat(chain.get(0).get("from_traveler_id")).as("the trip's creator").isEqualTo(alice);
        assertThat(chain.get(0).get("to_traveler_id")).isEqualTo(bob);
        assertThat(chain.get(1).get("from_traveler_id")).isEqualTo(bob);
        assertThat(chain.get(1).get("to_traveler_id")).isEqualTo(alice);
        assertThat(ownerIdColumnOf(trip)).isEqualTo(alice);
    }


    @Test
    void aStaleAcceptCannotSeizeSomebodyElsesCrown() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String bToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String cToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID ownerId = travelerIdOf(ownerToken);
        UUID bId = travelerIdOf(bToken);
        UUID cId = travelerIdOf(cToken);

        offer(ownerToken, trip, bId).expectStatus().isCreated();
        revoke(ownerToken, trip).expectStatus().isNoContent();
        offer(ownerToken, trip, cId).expectStatus().isCreated();

        accept(bToken, trip)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_OFFER_TARGET");

        assertThat(roleOnRoster(ownerToken, trip, ownerId)).isEqualTo("owner");
        assertThat(transfersFor(trip)).isEmpty();

        accept(cToken, trip).expectStatus().isNoContent();
        assertThat(roleOnRoster(cToken, trip, cId)).isEqualTo("owner");
        assertThat(transfersFor(trip)).hasSize(1);
    }

    @Test
    void aVoidedOfferCannotBeAcceptedEvenAfterRejoining() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String email = uniqueEmail();
        String memberToken = joinAsMember(ownerToken, trip, email);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();
        depart(memberToken, trip, memberId).expectStatus().isNoContent();

        accept(memberToken, trip).expectStatus().isNotFound();

        acceptInvitation(memberToken, invite(ownerToken, trip, email));
        accept(memberToken, trip)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
        assertThat(transfersFor(trip)).isEmpty();
    }


    @Test
    void everyTripInThisSuiteHasExactlyOneOwnerAtAllTimes() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();
        accept(memberToken, trip).expectStatus().isNoContent();

        List<Map<String, Object>> misowned =
                jdbc.queryForList(
                        "SELECT workspace_id, count(*) FILTER (WHERE role = 'OWNER') AS owners "
                                + "FROM membership GROUP BY workspace_id HAVING count(*) FILTER (WHERE role = 'OWNER') <> 1");
        assertThat(misowned).as("INV-4: exactly one owner per workspace, always").isEmpty();
    }



    private RestTestClient.ResponseSpec offer(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetTravelerId + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec accept(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec revoke(String callerToken, String tripId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetTravelerId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private String roleOnRoster(String token, String tripId, UUID travelerId) {
        byte[] body =
                rest.get()
                        .uri("/v1/itineraries/" + tripId + "/members")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String json = new String(body);
        int at = json.indexOf(travelerId.toString());
        String after = json.substring(at);
        String needle = "\"role\":\"";
        int start = after.indexOf(needle) + needle.length();
        return after.substring(start, after.indexOf('"', start));
    }

    private UUID ownerIdColumnOf(String tripId) {
        return jdbc.queryForObject(
                "SELECT owner_id FROM itinerary WHERE id = ?", UUID.class, UUID.fromString(tripId));
    }

    private List<Map<String, Object>> transfersFor(String tripId) {
        return jdbc.queryForList(
                "SELECT t.from_traveler_id, t.to_traveler_id FROM ownership_transfer t "
                        + "JOIN workspace w ON t.workspace_id = w.id WHERE w.itinerary_id = ? "
                        + "ORDER BY t.transferred_at ASC",
                UUID.fromString(tripId));
    }

    private List<String> offerStatusesFor(String tripId) {
        return jdbc.queryForList(
                "SELECT o.status FROM ownership_offer o JOIN workspace w ON o.workspace_id = w.id "
                        + "WHERE w.itinerary_id = ? ORDER BY o.offered_at ASC",
                String.class,
                UUID.fromString(tripId));
    }

    private String joinAsMember(String ownerToken, String tripId, String email) {
        String invitationId = invite(ownerToken, tripId, email);
        String memberToken = verified(email);
        acceptInvitation(memberToken, invitationId);
        return memberToken;
    }

    private String invite(String ownerToken, String tripId, String email) {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"email\":\"" + email + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(body, "id");
    }

    private void acceptInvitation(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destination":"Palawan"}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
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

    private static String uniqueEmail() {
        return "traveler-" + UUID.randomUUID() + "@example.com";
    }

    private static String verified(String email) {
        return TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }
}
