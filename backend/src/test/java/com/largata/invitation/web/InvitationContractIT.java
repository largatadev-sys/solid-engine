package com.largata.invitation.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * S1.2's endpoint contract over HTTP: invite → inbox → accept → member, plus every rejection the
 * mobile client branches on (Artifact 05 codes). The mailer is the logging adapter here (no Resend
 * key), so these prove the port and the state machine; the real inbox is the deployed-rung gate
 * (ticket 10). One class per file (Failsafe matches {@code *IT} on the outer class only — S0.1 gotcha).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class InvitationContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    // --- invite (owner side) ----------------------------------------------------------------------

    @Test
    void anOwnerCanInviteAnEmailAndGetsThePendingInvitationBack() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"guest@example.com"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.id")
                .exists()
                .jsonPath("$.email")
                .isEqualTo("guest@example.com")
                .jsonPath("$.expiresAt")
                .exists();
    }

    @Test
    void aMixedCaseAddressIsNormalisedToLowercase() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"Guest@Example.COM"}
                        """)
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.email")
                .isEqualTo("guest@example.com");
    }

    @Test
    void aNonMemberCannotInviteAndCannotTellTheItineraryExists() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String stranger = verified("stranger@example.com");

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"guest@example.com"}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }

    @Test
    void aSecondInvitationToTheSameAddressIsAConflict() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        invite(owner, itinerary, "guest@example.com");

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"guest@example.com"}
                        """)
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_ALREADY_PENDING");
    }

    @Test
    void aBlankOrMalformedEmailIsABadRequest() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"not-an-email"}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void aMemberWhoIsNotTheOwnerCannotInvite() {
        // The 403-vs-404 distinction grilling Q2 rests on: a member IS on the itinerary (not masked),
        // but lacks the owner role. Distinct from the non-member 404 above.
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String memberEmail = uniqueGuest();
        String memberToken = verified(memberEmail);
        accept(memberToken, invite(owner, itinerary, memberEmail)); // this traveler is now a MEMBER

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"newcomer@example.com"}
                        """)
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    @Test
    void aMemberWhoIsNotTheOwnerCannotRevoke() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String memberEmail = uniqueGuest();
        String memberToken = verified(memberEmail);
        accept(memberToken, invite(owner, itinerary, memberEmail)); // now a MEMBER
        String pendingId = invite(owner, itinerary, uniqueGuest()); // the owner's pending invitation

        rest.post()
                .uri("/v1/invitations/" + pendingId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    // --- inbox + accept (invitee side) ------------------------------------------------------------

    @Test
    void anInviteeSeesTheInvitationInTheirInboxWithTripAndInviter() {
        // A unique invited address so this inbox holds only THIS test's invitation: the container is
        // shared across the run (PostgresTestBase), and the inbox filters by email across all
        // workspaces, so a reused address would let other tests' pending rows appear here.
        String guestEmail = uniqueGuest();
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        String itinerary = createItinerary(owner, "Portugal 26");
        invite(owner, itinerary, guestEmail);
        String guest = verified(guestEmail);

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].tripTitle")
                .isEqualTo("Portugal 26")
                .jsonPath("$.items[0].inviterName")
                .isEqualTo("Ana Silva")
                .jsonPath("$.items[0].itineraryId")
                .isEqualTo(itinerary)
                .jsonPath("$.nextCursor")
                .doesNotExist();
    }

    @Test
    void anUnverifiedInviteeSeesAnEmptyInbox() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        invite(owner, itinerary, "guest@example.com");
        String unverifiedGuest = TestJwtSupport.unverifiedToken("uid-" + UUID.randomUUID(), "guest@example.com");

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(unverifiedGuest))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items")
                .isEmpty();
    }

    @Test
    void acceptingJoinsTheTripAndOpensItToTheNewMember() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        String guest = verified("guest@example.com");

        // Before accepting, the guest cannot see the private itinerary (guard 404).
        rest.get()
                .uri("/v1/itineraries/" + itinerary)
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.itineraryId")
                .isEqualTo(itinerary);

        // The walls have opened: the same guest now reads the itinerary through the guard.
        rest.get()
                .uri("/v1/itineraries/" + itinerary)
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isOk();
    }

    @Test
    void anUnverifiedEmailCannotAccept() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        String unverifiedGuest = TestJwtSupport.unverifiedToken("uid-" + UUID.randomUUID(), "guest@example.com");

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(unverifiedGuest))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EMAIL_NOT_VERIFIED");
    }

    @Test
    void aDifferentVerifiedEmailCannotAcceptAndCannotTellTheInvitationExists() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        String someoneElse = verified("someone.else@example.com");

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(someoneElse))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_NOT_FOUND");
    }

    @Test
    void acceptingATwicePendingInvitationIsAConflict() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        String guest = verified("guest@example.com");
        accept(guest, invitationId);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_TRANSITION");
    }

    @Test
    void invitingAnExistingMemberIsAConflict() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        accept(verified("guest@example.com"), invitationId);

        rest.post()
                .uri("/v1/itineraries/" + itinerary + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"email":"guest@example.com"}
                        """)
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ALREADY_A_MEMBER");
    }

    // --- decline + revoke -------------------------------------------------------------------------

    @Test
    void decliningResolvesTheInvitationWithoutJoining() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        String guest = verified("guest@example.com");

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isNoContent();

        // Declined is terminal: a later accept is a conflict, and the guest is not a member.
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isEqualTo(409);
        rest.get()
                .uri("/v1/itineraries/" + itinerary)
                .header(HttpHeaders.AUTHORIZATION, bearer(guest))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void anOwnerCanRevokeAPendingInvitationAndItLeavesTheInbox() {
        // Unique address so the post-revoke inbox check sees only this test's (now revoked) invitation.
        String guestEmail = uniqueGuest();
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, guestEmail);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(verified(guestEmail)))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items")
                .isEmpty();
    }

    @Test
    void aNonMemberCannotRevokeAndCannotTellTheInvitationExists() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(verified("stranger@example.com")))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    // --- member list ------------------------------------------------------------------------------

    @Test
    void theMemberListNamesTheOwnerAndAcceptedMembersWithRoles() {
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        String itinerary = createItinerary(owner);
        String invitationId = invite(owner, itinerary, "guest@example.com");
        accept(verifiedNamed("guest@example.com", "Beto Cruz"), invitationId);

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                // Owner first (joined at the trip's instant), then the accepted member.
                .jsonPath("$.items[0].role")
                .isEqualTo("owner")
                .jsonPath("$.items[0].displayName")
                .isEqualTo("Ana Silva")
                .jsonPath("$.items[1].role")
                .isEqualTo("member")
                .jsonPath("$.items[1].displayName")
                .isEqualTo("Beto Cruz");
    }

    @Test
    void aNonMemberCannotListMembers() {
        String owner = verified("owner@example.com");
        String itinerary = createItinerary(owner);

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(verified("stranger@example.com")))
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    // --- helpers ----------------------------------------------------------------------------------

    private String invite(String ownerToken, String itineraryId, String email) {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + itineraryId + "/invitations")
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

    private String createItinerary(String token) {
        return createItinerary(token, "A trip");
    }

    private String createItinerary(String token, String title) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"" + title + "\",\"destinations\":[\"Lisbon\"]}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    /** A unique invited address per call — isolates inbox assertions on the shared container. */
    private static String uniqueGuest() {
        return "guest-" + UUID.randomUUID() + "@example.com";
    }

    /** A verified token for a fresh traveler with this email (Google / verified-password shape). */
    private static String verified(String email) {
        return TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
    }

    private static String verifiedNamed(String email, String name) {
        return TestJwtSupport.verifiedTokenWithName("uid-" + UUID.randomUUID(), email, name);
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
