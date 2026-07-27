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
 * S1.5's endpoint contract over HTTP: the full authority matrix (spec §4), the eviction it produces,
 * its idempotency, and the way back in.
 *
 * <p><strong>Members are made by the real invite → accept round-trip here</strong>, not by an INSERT
 * like {@code EditLeaseContractIT}'s fixture. This story destroys what S1.2 creates, so a test that
 * planted its own rows could pass against a departure that does not actually undo a real join — and
 * AC 9 (re-invite after removal) has to run the real flow anyway.
 *
 * <p>One class per file (Failsafe matches {@code *IT} on the outer class only — S0.1 gotcha).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class MemberDepartureContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    // --- the two doors ----------------------------------------------------------------------------

    @Test
    void anOwnerRemovesAMemberAndTheRosterForgetsThem() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberEmail = uniqueEmail();
        String memberToken = joinAsMember(ownerToken, trip, memberEmail);

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        // The roster is the observable consequence: one row left, the owner's.
        rest.get()
                .uri("/v1/itineraries/" + trip + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(1)
                .jsonPath("$.items[0].role")
                .isEqualTo("owner");
    }

    @Test
    void aMemberLeavesOfTheirOwnAccord() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());

        // Same endpoint, same 204 — the door is chosen by the target being the caller's own id.
        depart(memberToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        rest.get()
                .uri("/v1/itineraries/" + trip + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(1);
    }

    // --- authority --------------------------------------------------------------------------------

    @Test
    void aMemberCannotRemoveAnotherMember() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String oneMember = joinAsMember(ownerToken, trip, uniqueEmail());
        String anotherMember = joinAsMember(ownerToken, trip, uniqueEmail());

        depart(oneMember, trip, travelerIdOf(anotherMember))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    @Test
    void aMemberTargetingSomeoneAlreadyGoneIsStillForbidden() {
        // Authority before idempotency (spec §4). Were the order reversed this would answer 204 — an
        // authority answer that changes shape as other people come and go, and one that quietly tells
        // the caller something about the roster instead of refusing them.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String survivingMember = joinAsMember(ownerToken, trip, uniqueEmail());
        String doomedMember = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID doomedId = travelerIdOf(doomedMember);
        depart(ownerToken, trip, doomedId).expectStatus().isNoContent(); // now genuinely gone

        depart(survivingMember, trip, doomedId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    @Test
    void aMemberCannotRemoveTheOwnerEither() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());

        // 403, not 409: the authority rung comes first, so this caller never reaches the INV-4 check.
        depart(memberToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    // --- INV-4 ------------------------------------------------------------------------------------

    @Test
    void theOwnerCannotLeaveAndTheirRowSurvives() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        joinAsMember(ownerToken, trip, uniqueEmail()); // a member exists, so "just transfer" is possible

        depart(ownerToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");

        // INV-4 intact: the owner still owns the trip and can still read it.
        rest.get()
                .uri("/v1/itineraries/" + trip + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].role")
                .isEqualTo("owner");
    }

    @Test
    void theSoleOwnerOfAnEmptyTripAlsoCannotLeave() {
        // The "there is nobody to transfer to" case answers identically — S1.5 refuses the owner's exit
        // whole, rather than growing a special case S1.6 would then have to unpick.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);

        depart(ownerToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");
    }

    // --- idempotency + masking --------------------------------------------------------------------

    @Test
    void removingTheAlreadyRemovedIsStillNoContent() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        UUID memberId = travelerIdOf(joinAsMember(ownerToken, trip, uniqueEmail()));

        depart(ownerToken, trip, memberId).expectStatus().isNoContent();
        // Artifact 05: deleting the deleted is still 204. Nothing leaks — the owner can read the roster.
        depart(ownerToken, trip, memberId).expectStatus().isNoContent();
    }

    @Test
    void removingSomeoneWhoWasNeverAMemberIsNoContent() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        UUID strangerId = travelerIdOf(verified(uniqueEmail()));

        depart(ownerToken, trip, strangerId).expectStatus().isNoContent();
    }

    @Test
    void aNonMemberIsMaskedAndLearnsNothingAboutTheRoster() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        UUID memberId = travelerIdOf(joinAsMember(ownerToken, trip, uniqueEmail()));
        String stranger = verified(uniqueEmail());

        depart(stranger, trip, memberId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }

    @Test
    void aVisitorWithNoTokenIsRejectedAtTheSecurityChain() {
        rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + UUID.randomUUID() + "/members/" + UUID.randomUUID())
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    // --- eviction ---------------------------------------------------------------------------------

    @Test
    void theSameProbeAnswers200BeforeRemovalAnd404After() {
        // AC 7, and the point is the *pairing*: a probe whose two outcomes are indistinguishable is not
        // a check (the lesson this repo has now been burned by three times). The before-read proves the
        // 404 afterwards means "evicted" rather than "this probe never worked".
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());

        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk();

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void anEvictedMemberCanNoLongerWriteThePlan() {
        // The walls close on writes as well as reads: the guard rejects before the edit lease is ever
        // consulted, so the ex-member gets the mask, not a lock conflict.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        acquireLock(memberToken, trip); // they held the lock legitimately a moment ago

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        // A fully VALID body, deliberately. Bean Validation on the @Valid request body runs before the
        // controller method — so before the guard — and an incomplete body answers 400 without ever
        // testing authorization. (Not a masking leak: that 400 is decided by the caller's own payload,
        // never by server state. But it does mean a guard assertion on a write endpoint has to send a
        // body the validator accepts, or it proves nothing. This test asserted 404 against a 400 first.)
        rest.method(HttpMethod.PATCH)
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Renamed by an ex-member","destinations":["Palawan"]}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    // --- the way back in --------------------------------------------------------------------------

    @Test
    void aRemovedMemberCanBeReInvitedAndRejoins() {
        // AC 9. The hard delete is what makes this work with no extra code: ALREADY_A_MEMBER clears the
        // moment the row goes, and the invitation statuses are terminal so the reissue is a new row.
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String returnerEmail = uniqueEmail();
        String returnerToken = joinAsMember(ownerToken, trip, returnerEmail);
        UUID returnerId = travelerIdOf(returnerToken);

        depart(ownerToken, trip, returnerId).expectStatus().isNoContent();

        // The same address invites cleanly again — no ALREADY_A_MEMBER conflict left behind.
        String secondInvitation = invite(ownerToken, trip, returnerEmail);
        accept(returnerToken, secondInvitation);

        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(returnerToken))
                .exchange()
                .expectStatus()
                .isOk();
        rest.get()
                .uri("/v1/itineraries/" + trip + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(2)
                .jsonPath("$.items[1].travelerId")
                .isEqualTo(returnerId.toString());
    }

    // --- fixtures ---------------------------------------------------------------------------------

    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetTravelerId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    /** The real S1.2 path to membership: the owner invites, the invitee accepts. Returns their token. */
    private String joinAsMember(String ownerToken, String tripId, String email) {
        String invitationId = invite(ownerToken, tripId, email);
        String memberToken = verified(email);
        accept(memberToken, invitationId);
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

    private void accept(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void acquireLock(String token, String tripId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
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

    /**
     * A unique address per traveler. The container is shared across the run (PostgresTestBase) and the
     * invitation inbox filters by email across every workspace, so a reused address would let another
     * test's pending row surface in this one's flow.
     */
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
