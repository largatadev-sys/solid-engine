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

/**
 * S1.6 ticket 02: accepting an offer <em>is</em> the transfer, and this proves the four effects land
 * together (spec ACs 4, 5, 7, and the transfer half of 10/11).
 *
 * <p><strong>The four-effects test is deliberately one test, not four.</strong> They share a
 * transaction, so their real property is inseparability — split across four tests, each could pass
 * while the set was incoherent (a crown with no record, a record with no crown, a column naming a
 * stranger). Asserting them together is what makes a partial commit a failure rather than three passes
 * and one puzzle.
 *
 * <p>Ownership state is read through the API where the API exposes it (the roster's {@code role}) and
 * through SQL where it does not (the {@code ownership_transfer} row, {@code itinerary.owner_id}) —
 * those two have no reader in the product by design, so the database is the only honest witness.
 */
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

    // --- the transfer itself (AC 4) -----------------------------------------------------------------

    @Test
    void acceptingAnOfferSwapsRolesSyncsTheItineraryAndRecordsTheTransfer() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID formerOwnerId = travelerIdOf(ownerToken);
        UUID newOwnerId = travelerIdOf(memberToken);
        offer(ownerToken, trip, newOwnerId).expectStatus().isCreated();

        accept(memberToken, trip).expectStatus().isNoContent();

        // 1 + 2. The roles swapped — both directions, because a promote without a demote is two owners
        // and a demote without a promote is none.
        assertThat(roleOnRoster(ownerToken, trip, newOwnerId)).isEqualTo("owner");
        assertThat(roleOnRoster(ownerToken, trip, formerOwnerId)).isEqualTo("member");

        // 3. The denormalised column followed. Nothing in the request path reads it, which is exactly
        // why it needs a test: a drift here would be invisible until something trusted the name.
        assertThat(ownerIdColumnOf(trip)).isEqualTo(newOwnerId);

        // 4. The durable record exists and says the right thing — the one artifact that could never be
        // reconstructed after the fact.
        List<Map<String, Object>> transfers = transfersFor(trip);
        assertThat(transfers).hasSize(1);
        assertThat(transfers.getFirst().get("from_traveler_id")).isEqualTo(formerOwnerId);
        assertThat(transfers.getFirst().get("to_traveler_id")).isEqualTo(newOwnerId);

        // 5. ...and the offer closed, so the slot is free and nobody can accept it twice.
        assertThat(offerStatusesFor(trip)).containsExactly("ACCEPTED");
        accept(memberToken, trip).expectStatus().isNotFound();
    }

    @Test
    void theFormerOwnerKeepsTheirMembershipAndCanNowLeave() {
        // The story's whole reason to exist: S1.5's OWNER_CANNOT_LEAVE dead end opens. Transfer is a
        // role swap, not an exit — leaving stays a separate act, and the two compose with no new code.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID formerOwnerId = travelerIdOf(ownerToken);
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        // Before: the owner cannot leave. This is the control that makes the "after" meaningful.
        depart(ownerToken, trip, formerOwnerId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");

        accept(memberToken, trip).expectStatus().isNoContent();

        // After: the same call, the same person, now permitted — because they are a member.
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
        // Roles are not decoration: the swap must move what the roles *do*. Offering ownership is an
        // owner-only act, so it is the cheapest true probe of authority having moved.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String thirdToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();
        accept(memberToken, trip).expectStatus().isNoContent();

        // The former owner can no longer offer...
        offer(ownerToken, trip, travelerIdOf(thirdToken))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        // ...and the new owner can.
        offer(memberToken, trip, travelerIdOf(thirdToken)).expectStatus().isCreated();
    }

    @Test
    void ownershipCanTravelBackAndTheChainRecordsBothHops() {
        // Two transfers, so the record is a chain rather than a single row — and the creator stays
        // derivable as the earliest row's `from`, which is the property the influencer program and the
        // E4 creator badge will want.
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

    // --- the stale-accept race (AC 5) ---------------------------------------------------------------

    @Test
    void aStaleAcceptCannotSeizeSomebodyElsesCrown() {
        // B is offered, the offer is revoked, C is offered. B's late accept — a retry, a stale screen,
        // a queued request — must not take the crown meant for C. It is refused by construction: the
        // pending offer exists but is not B's, so the ladder answers 403 without consulting timing.
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
                .isEqualTo("NOT_PERMITTED");

        // Nothing moved, and C's offer is intact — the refusal cost C nothing.
        assertThat(roleOnRoster(ownerToken, trip, ownerId)).isEqualTo("owner");
        assertThat(transfersFor(trip)).isEmpty();

        accept(cToken, trip).expectStatus().isNoContent();
        assertThat(roleOnRoster(cToken, trip, cId)).isEqualTo("owner");
        assertThat(transfersFor(trip)).hasSize(1);
    }

    @Test
    void aVoidedOfferCannotBeAcceptedEvenAfterRejoining() {
        // The offeree left while holding an offer, then was re-invited. Their old offer died with their
        // membership, so there is no crown lying around for the returning traveler to pick up — a
        // pending row that survived a departure would be exactly that.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String email = uniqueEmail();
        String memberToken = joinAsMember(ownerToken, trip, email);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();
        depart(memberToken, trip, memberId).expectStatus().isNoContent();

        // While outside the walls, they are masked rather than told about offers.
        accept(memberToken, trip).expectStatus().isNotFound();

        // Back inside, the answer is the honest one: there is no offer here.
        acceptInvitation(memberToken, invite(ownerToken, trip, email));
        accept(memberToken, trip)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
        assertThat(transfersFor(trip)).isEmpty();
    }

    // --- INV-4 under everything (AC 7) --------------------------------------------------------------

    @Test
    void everyTripInThisSuiteHasExactlyOneOwnerAtAllTimes() {
        // The blanket invariant: whatever paths ran above, no workspace in the database may hold zero
        // or two owners. A single query over the whole schema catches a break that a per-test assertion
        // aimed at one trip would miss.
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

    // (Analytics for the whole S1.6 surface — the four offer events plus ownership_transferred — live
    // in OwnershipOfferAnalyticsIT, which owns the log-appender fixture the other analytics ITs use.)

    // --- fixtures -----------------------------------------------------------------------------------

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
                                {"title":"Trip","destinations":["Palawan"]}
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
