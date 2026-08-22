package com.largata.membership;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
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
class PublishFreezesMembershipIT extends PostgresTestBase {

    private static final String FROZEN = "MEMBERSHIP_FROZEN";

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void invitingByHandleIsRefusedOnAPublishedTrip() {
        Trip trip = published();
        String outsider = uniqueHandle("outsider");
        rig.travelerWithHandle(outsider);

        inviteByHandle(trip.owner, trip.id, outsider)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void invitingByEmailIsRefusedOnAPublishedTrip() {
        Trip trip = published();

        inviteByEmail(trip.owner, trip.id, uniqueEmail())
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void revokingAnInvitationIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String invitationId = fieldIn(issuedByEmail(trip.owner, trip.id, uniqueEmail()), "id");
        publish(trip);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void acceptingAnInvitationIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String inviteeEmail = uniqueEmail();
        String invitationId = fieldIn(issuedByEmail(trip.owner, trip.id, inviteeEmail), "id");
        String invitee = TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), inviteeEmail);
        publish(trip);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(invitee))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void removingAMemberIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        publish(trip);

        depart(trip.owner, trip.id, rig.travelerIdOf(member))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void offeringOwnershipIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        publish(trip);

        offerOwnership(trip.owner, trip.id, rig.travelerIdOf(member))
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void revokingAnOwnershipOfferIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        offerOwnership(trip.owner, trip.id, rig.travelerIdOf(member)).expectStatus().isCreated();
        publish(trip);

        rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + trip.id + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void acceptingAnOwnershipOfferIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        offerOwnership(trip.owner, trip.id, rig.travelerIdOf(member)).expectStatus().isCreated();
        publish(trip);

        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void decliningAnOwnershipOfferIsRefusedOnAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        offerOwnership(trip.owner, trip.id, rig.travelerIdOf(member)).expectStatus().isCreated();
        publish(trip);

        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/ownership-offer/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(FROZEN);
    }


    @Test
    void aMemberStillLeavesAPublishedTrip() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        publish(trip);

        depart(member, trip.id, rig.travelerIdOf(member)).expectStatus().isNoContent();
    }


    @Test
    void aMemberStillLeavesAnArchivedTrip() {
        Trip trip = active();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk();

        depart(member, trip.id, rig.travelerIdOf(member)).expectStatus().isNoContent();
    }


    @Test
    void aCompletedButUnpublishedTripStillTakesNewTravelers() {
        Trip trip = completed();
        String outsider = uniqueHandle("outsider");
        rig.travelerWithHandle(outsider);

        inviteByHandle(trip.owner, trip.id, outsider).expectStatus().isCreated();
    }


    @Test
    void aCompletedButUnpublishedTripStillRemovesAndOffers() {
        Trip trip = completed();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        String other = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("other"));

        offerOwnership(trip.owner, trip.id, rig.travelerIdOf(member)).expectStatus().isCreated();
        depart(trip.owner, trip.id, rig.travelerIdOf(other)).expectStatus().isNoContent();
    }


    @Test
    void pendingInvitationsGoInvisibleWhilePublishedAndComeBackOnUnpublish() {
        Trip trip = completed();
        issuedByEmail(trip.owner, trip.id, uniqueEmail());
        pendingCount(trip).jsonPath("$.items.length()").isEqualTo(1);

        publish(trip);
        pendingCount(trip).jsonPath("$.items.length()").isEqualTo(0);

        unpublish(trip);
        pendingCount(trip).jsonPath("$.items.length()").isEqualTo(1);
    }


    @Test
    void aPendingInvitationVanishesFromTheInviteesInboxWhileTheTripIsPublished() {
        Trip trip = completed();
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        inviteByHandle(trip.owner, trip.id, inviteeHandle).expectStatus().isCreated();
        inboxOf(invitee).jsonPath("$.items.length()").isEqualTo(1);

        publish(trip);
        inboxOf(invitee).jsonPath("$.items.length()").isEqualTo(0);

        unpublish(trip);
        inboxOf(invitee).jsonPath("$.items.length()").isEqualTo(1);
    }


    private record Trip(String id, String owner) {}

    private Trip active() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        return new Trip(rig.createTrip(owner, 1), owner);
    }

    private Trip completed() {
        Trip trip = active();
        climb(trip, "/start");
        climb(trip, "/complete");
        return trip;
    }

    private Trip published() {
        Trip trip = completed();
        publish(trip);
        return trip;
    }

    private void climb(Trip trip, String rung) {
        rest.post()
                .uri("/v1/itineraries/" + trip.id + rung)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void publish(Trip trip) {
        climb(trip, "/publish");
    }

    private void unpublish(Trip trip) {
        climb(trip, "/unpublish");
    }

    private RestTestClient.BodyContentSpec pendingCount(Trip trip) {
        return rest.get()
                .uri("/v1/itineraries/" + trip.id + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }

    private RestTestClient.BodyContentSpec inboxOf(String token) {
        return rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }

    private RestTestClient.ResponseSpec depart(String token, String tripId, UUID targetTravelerId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetTravelerId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec offerOwnership(String token, String tripId, UUID targetTravelerId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetTravelerId + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec inviteByHandle(String token, String tripId, String handle) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec inviteByEmail(String token, String tripId, String email) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + email + "\"}")
                .exchange();
    }

    private byte[] issuedByEmail(String token, String tripId, String email) {
        return inviteByEmail(token, tripId, email)
                .expectStatus()
                .isCreated()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String uniqueEmail() {
        return "invitee-" + UUID.randomUUID() + "@example.com";
    }
}
