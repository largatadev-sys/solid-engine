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


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class MemberDepartureContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void anOwnerRemovesAMemberAndTheRosterForgetsThem() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberEmail = uniqueEmail();
        String memberToken = joinAsMember(ownerToken, trip, memberEmail);

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

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
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String survivingMember = joinAsMember(ownerToken, trip, uniqueEmail());
        String doomedMember = joinAsMember(ownerToken, trip, uniqueEmail());
        UUID doomedId = travelerIdOf(doomedMember);
        depart(ownerToken, trip, doomedId).expectStatus().isNoContent();

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

        depart(memberToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void theOwnerCannotLeaveAndTheirRowSurvives() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        joinAsMember(ownerToken, trip, uniqueEmail());

        depart(ownerToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");

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
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);

        depart(ownerToken, trip, travelerIdOf(ownerToken))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OWNER_CANNOT_LEAVE");
    }


    @Test
    void removingTheAlreadyRemovedIsStillNoContent() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        UUID memberId = travelerIdOf(joinAsMember(ownerToken, trip, uniqueEmail()));

        depart(ownerToken, trip, memberId).expectStatus().isNoContent();
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


    @Test
    void theSameProbeAnswers200BeforeRemovalAnd404After() {
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
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        acquireLock(memberToken, trip);

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        rest.method(HttpMethod.PATCH)
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"Renamed by an ex-member","destination":"Palawan"}
                        """)
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aRemovedMemberCanBeReInvitedAndRejoins() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String returnerEmail = uniqueEmail();
        String returnerToken = joinAsMember(ownerToken, trip, returnerEmail);
        UUID returnerId = travelerIdOf(returnerToken);

        depart(ownerToken, trip, returnerId).expectStatus().isNoContent();

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


    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetTravelerId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetTravelerId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }


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
