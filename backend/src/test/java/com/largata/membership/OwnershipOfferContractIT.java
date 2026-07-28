package com.largata.membership;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * S1.6 ticket 01 over HTTP: the offer lifecycle that moves no ownership — create, revoke, decline, and
 * the void a departure causes — plus the roster flag they are observable through (spec ACs 1–3, 6, 11).
 *
 * <p>Accepting is deliberately absent: it is the transfer, and it has its own class
 * ({@code OwnershipTransferIT}) because its assertions are about four effects landing together rather
 * than about an offer's status moving.
 *
 * <p>Members are made by the real invite → accept round trip, for {@code MemberDepartureContractIT}'s
 * reason: a planted row would let a test pass against machinery that does not actually interoperate
 * with how people really join.
 *
 * <p>One class per file (Failsafe matches {@code *IT} on the outer class only — S0.1 gotcha).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class OwnershipOfferContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    // --- create (AC 1) ------------------------------------------------------------------------------

    @Test
    void theOwnerOffersOwnershipAndTheRosterSaysSo() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID memberId = travelerIdOf(memberToken);

        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        // The flag lands on the target's row and nobody else's — at most one per response, because at
        // most one offer may be pending per trip.
        roster(ownerToken, trip)
                .jsonPath("$.items[?(@.travelerId=='" + memberId + "')].ownershipOffered")
                .isEqualTo(true)
                .jsonPath("$.items[?(@.role=='owner')].ownershipOffered")
                .isEqualTo(false);
    }

    @Test
    void theOffereeSeesTheirOwnPendingOfferOnTheRoster() {
        // The offeree's discovery path: they read the same roster and find the flag on their own row.
        // Governance state is workspace-walled, not private between two people (INV-1).
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        roster(memberToken, trip)
                .jsonPath("$.items[?(@.travelerId=='" + memberId + "')].ownershipOffered")
                .isEqualTo(true);
    }

    @Test
    void aMemberCannotOfferOwnership() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String oneMember = joinAsMember(ownerToken, trip, uniqueEmail());
        String anotherMember = joinAsMember(ownerToken, trip, uniqueEmail());

        offer(oneMember, trip, travelerIdOf(anotherMember))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    @Test
    void offeringToSomeoneWhoIsNotOnTheTripIsAConflictNamingTheRemedy() {
        // 409, not 404: the owner can read their own roster, so there is nothing to mask. Masking
        // exists to stop a probe learning an id is real — not to refuse a coherent request.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String strangerToken = verified(uniqueEmail());

        offer(ownerToken, trip, travelerIdOf(strangerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TARGET_NOT_A_MEMBER");
    }

    @Test
    void theOwnerCannotOfferOwnershipToThemselves() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);

        offer(ownerToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("CANNOT_OFFER_TO_SELF");
    }

    @Test
    void aSecondOfferIsRefusedWhileOneIsPending() {
        // One crown, one outstretched hand. No silent supersede: the owner must revoke explicitly, so
        // they always know they are retracting from one person before extending to another.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String first = joinAsMember(ownerToken, trip, uniqueEmail());
        String second = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(first)).expectStatus().isCreated();

        offer(ownerToken, trip, travelerIdOf(second))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_ALREADY_PENDING");
    }

    // --- revoke (AC 2) ------------------------------------------------------------------------------

    @Test
    void theOwnerRevokesTheOfferAndTheFlagClears() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        revoke(ownerToken, trip).expectStatus().isNoContent();

        roster(ownerToken, trip)
                .jsonPath("$.items[?(@.travelerId=='" + memberId + "')].ownershipOffered")
                .isEqualTo(false);
        // ...and the slot is genuinely free again, which is the consequence that matters.
        offer(ownerToken, trip, memberId).expectStatus().isCreated();
    }

    @Test
    void revokingWhenNothingIsPendingIsStillNoContent() {
        // Artifact 05: the asked-for end state — no outstretched hand — already holds. Nothing leaks;
        // the caller is the owner and can read the roster anyway.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        joinAsMember(ownerToken, trip, uniqueEmail());

        revoke(ownerToken, trip).expectStatus().isNoContent();
        revoke(ownerToken, trip).expectStatus().isNoContent();
    }

    @Test
    void aMemberCannotRevokeTheOwnersOffer() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String bystander = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        revoke(bystander, trip)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    // --- decline (AC 3) -----------------------------------------------------------------------------

    @Test
    void theOffereeDeclinesAndOwnershipDoesNotMove() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID ownerId = travelerIdOf(ownerToken);
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        decline(memberToken, trip).expectStatus().isNoContent();

        // The crown stayed put — the assertion that makes this more than a status flip.
        roster(ownerToken, trip)
                .jsonPath("$.items[?(@.role=='owner')].travelerId")
                .isEqualTo(ownerId.toString());
    }

    @Test
    void aDeclinedOfferFreesTheSlotForAnother() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String first = joinAsMember(ownerToken, trip, uniqueEmail());
        String second = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(first)).expectStatus().isCreated();
        decline(first, trip).expectStatus().isNoContent();

        // Terminal statuses plus a partial index means the reissue is simply a new row (the S1.2 shape).
        offer(ownerToken, trip, travelerIdOf(second)).expectStatus().isCreated();
        offer(ownerToken, trip, travelerIdOf(first))
                .expectStatus()
                .isEqualTo(409); // and the one-at-a-time rule still holds
    }

    @Test
    void decliningWithNoOfferOnTheTripIsNotFound() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());

        decline(memberToken, trip)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
    }

    @Test
    void aMemberCannotDeclineAnOfferMadeToSomebodyElse() {
        // 403, not 404: an offer exists, it simply is not theirs. The distinction is what makes the
        // stale-accept race safe — refusing must not depend on who the offer happens to target.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String offeree = joinAsMember(ownerToken, trip, uniqueEmail());
        String bystander = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(offeree)).expectStatus().isCreated();

        decline(bystander, trip)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                // Its own code, not NOT_PERMITTED: this caller lacks no role, they are reaching for
                // somebody else's offer, and the client's copy for the two cases must differ.
                .isEqualTo("NOT_OFFER_TARGET");
    }

    // --- void on departure (AC 6) -------------------------------------------------------------------

    @Test
    void theOffereeLeavingVoidsTheOfferAndFreesTheSlot() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String leaverToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String stayerToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(leaverToken)).expectStatus().isCreated();

        depart(leaverToken, trip, travelerIdOf(leaverToken)).expectStatus().isNoContent();

        // The proof is not the status column (which this test cannot see) but its consequence: the
        // pending slot is free, which it would not be if the offer still stood.
        offer(ownerToken, trip, travelerIdOf(stayerToken)).expectStatus().isCreated();
    }

    @Test
    void removingTheOffereeVoidsTheOfferAndIsNotBlockedByIt() {
        // Removal never has to wait for a revoke: removing the person obviously retracts the offer, and
        // a 409 telling the owner to revoke first would be ceremony with no protective value.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String doomedToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String stayerToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(doomedToken)).expectStatus().isCreated();

        depart(ownerToken, trip, travelerIdOf(doomedToken)).expectStatus().isNoContent();

        offer(ownerToken, trip, travelerIdOf(stayerToken)).expectStatus().isCreated();
    }

    @Test
    void anUnrelatedMemberLeavingDoesNotDisturbTheOffer() {
        // The void must be surgical — scoped to the departing traveler, not "any pending offer here".
        // Without the target predicate this test would pass a broken implementation.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String offeree = joinAsMember(ownerToken, trip, uniqueEmail());
        String unrelated = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID offereeId = travelerIdOf(offeree);
        offer(ownerToken, trip, offereeId).expectStatus().isCreated();

        depart(unrelated, trip, travelerIdOf(unrelated)).expectStatus().isNoContent();

        roster(ownerToken, trip)
                .jsonPath("$.items[?(@.travelerId=='" + offereeId + "')].ownershipOffered")
                .isEqualTo(true);
    }

    @Test
    void aDepartureFromAnotherTripLeavesThisOneAlone() {
        // The void is scoped by workspace as well as by traveler: one person on two trips, leaving one,
        // must not dissolve the offer standing on the other.
        String ownerToken = verified(uniqueEmail());
        String tripA = createTrip(ownerToken);
        String tripB = createTrip(ownerToken);
        String email = uniqueEmail();
        String memberToken = joinAsMember(ownerToken, tripA, email);
        joinExistingTravelerAsMember(ownerToken, tripB, email, memberToken);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, tripA, memberId).expectStatus().isCreated();

        depart(memberToken, tripB, memberId).expectStatus().isNoContent();

        roster(ownerToken, tripA)
                .jsonPath("$.items[?(@.travelerId=='" + memberId + "')].ownershipOffered")
                .isEqualTo(true);
    }

    // --- masking (AC 11) ----------------------------------------------------------------------------

    @Test
    void aNonMemberIsMaskedOnEveryOfferRoute() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        String outsider = verified(uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        // 404 on all four — an outsider learns nothing about the trip, let alone its governance. Accept
        // is included deliberately: it is the one route that moves ownership, so "the whole surface"
        // (spec AC 11) has to mean all four rather than the three that only read or resolve.
        offer(outsider, trip, travelerIdOf(memberToken)).expectStatus().isNotFound();
        revoke(outsider, trip).expectStatus().isNotFound();
        decline(outsider, trip).expectStatus().isNotFound();
        acceptOwnership(outsider, trip).expectStatus().isNotFound();
    }

    @Test
    void anUnauthenticatedCallerIsRejectedOnEveryOfferRoute() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        UUID someId = travelerIdOf(ownerToken);

        rest.post()
                .uri("/v1/itineraries/" + trip + "/ownership-offer")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + someId + "\"}")
                .exchange()
                .expectStatus()
                .isUnauthorized();
        rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + trip + "/ownership-offer")
                .exchange()
                .expectStatus()
                .isUnauthorized();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/ownership-offer/decline")
                .exchange()
                .expectStatus()
                .isUnauthorized();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/ownership-offer/accept")
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    // --- fixtures -----------------------------------------------------------------------------------

    private RestTestClient.ResponseSpec offer(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetTravelerId + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec revoke(String callerToken, String tripId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec decline(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    /**
     * Accepting the ownership offer — for the masking test only; what accept <em>does</em> is {@code
     * OwnershipTransferIT}'s subject. Masking has to cover it here because this is the class that owns
     * "the whole surface" (AC 11).
     *
     * <p>Named for the offer, not just {@code accept}, because this class already has an {@code accept}
     * for invitations. Two different things one can accept on a trip is exactly the ambiguity a test
     * fixture should not carry.
     */
    private RestTestClient.ResponseSpec acceptOwnership(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetTravelerId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.BodyContentSpec roster(String token, String tripId) {
        return rest.get()
                .uri("/v1/itineraries/" + tripId + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }

    /** The real S1.2 path to membership: the owner invites, the invitee accepts. Returns their token. */
    private String joinAsMember(String ownerToken, String tripId, String email) {
        String invitationId = invite(ownerToken, tripId, email);
        String memberToken = verified(email);
        accept(memberToken, invitationId);
        return memberToken;
    }

    /** Adds an already-minted traveler to a second trip, so one identity can span two workspaces. */
    private void joinExistingTravelerAsMember(
            String ownerToken, String tripId, String email, String travelerToken) {
        accept(travelerToken, invite(ownerToken, tripId, email));
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

    private void accept(String token, String invitationId) {
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
