package com.largata.join;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;
import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class JoinLifecycleIT extends PostgresTestBase {

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
    void theLinkIsMintedLazilyAndTheSameTokenComesBackForever() {
        Trip trip = trip();

        String first = tokenOf(trip.owner, trip.id);
        String second = tokenOf(trip.owner, trip.id);

        assertThat(second).isEqualTo(first);
    }


    @Test
    void theLinkIsReadableByAnyMemberNotJustTheOwner() {
        Trip trip = trip();
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));

        assertThat(tokenOf(member, trip.id)).isEqualTo(tokenOf(trip.owner, trip.id));
    }


    @Test
    void aStrangerCannotReadTheLink() {
        Trip trip = trip();
        String stranger = rig.travelerWithHandle(uniqueHandle("stranger"));

        rest.get()
                .uri("/v1/itineraries/" + trip.id + "/join-link")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void theShareUrlIsComposedFromConfigurationAndCarriesTheToken() {
        Trip trip = trip();
        byte[] body = linkBody(trip.owner, trip.id);

        String token = fieldIn(body, "token");
        String shareUrl = fieldIn(body, "shareUrl");

        assertThat(shareUrl).contains("/join/" + token).matches(".*/join/" + token + "\\?v=\\d+$");
    }


    @Test
    void theTeaserAnswersAnonymouslyWithTheTripsShopWindow() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);

        rest.get()
                .uri("/v1/join/" + token)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Trip")
                .jsonPath("$.destination")
                .isEqualTo("Palawan")
                .jsonPath("$.travelerCount")
                .isEqualTo(1)
                .jsonPath("$.viewerState")
                .isEqualTo("signedOut");
    }


    @Test
    void theTeaserNeverCarriesRosterNamesOrPlanContent() {
        Trip trip = trip();
        rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        String token = tokenOf(trip.owner, trip.id);

        String body =
                new String(
                        rest.get()
                                .uri("/v1/join/" + token)
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());

        assertThat(body)
                .as("the teaser is a shop window, not a workspace read — it names no traveler and no plan")
                .doesNotContain("member")
                .doesNotContain("handle")
                .doesNotContain("days")
                .doesNotContain("activities");
    }


    @Test
    void theTeaserWithholdsTheWorkspaceIdFromEveryoneWhoCannotAlreadyOpenIt() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String stranger = rig.travelerWithHandle(uniqueHandle("stranger"));

        rest.get()
                .uri("/v1/join/" + token)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.itineraryId")
                .isEmpty();
        teaserAs(token, stranger).jsonPath("$.itineraryId").isEmpty();

        teaserAs(token, trip.owner)
                .jsonPath("$.itineraryId")
                .isEqualTo(trip.id);
    }


    @Test
    void anUnknownTokenIsNotFoundByItsOwnName() {
        rest.get()
                .uri("/v1/join/not-a-real-token")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("JOIN_LINK_NOT_FOUND");
    }


    @Test
    void aSignedInStrangerSeesCanRequestAndAMemberSeesMember() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String stranger = rig.travelerWithHandle(uniqueHandle("stranger"));

        teaserAs(token, stranger).jsonPath("$.viewerState").isEqualTo("canRequest");
        teaserAs(token, trip.owner).jsonPath("$.viewerState").isEqualTo("member");
    }


    @Test
    void requestingMovesTheViewerToPendingAndReOpeningTheLinkLandsThere() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));

        request(token, asker).expectStatus().isOk().expectBody().jsonPath("$.viewerState").isEqualTo("pending");
        teaserAs(token, asker).jsonPath("$.viewerState").isEqualTo("pending");
    }


    @Test
    void askingTwiceWhilePendingCreatesNoSecondRow() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));

        request(token, asker).expectStatus().isOk();
        request(token, asker).expectStatus().isOk().expectBody().jsonPath("$.viewerState").isEqualTo("pending");

        assertThat(queueSize(trip)).isEqualTo(1);
    }


    @Test
    void anUnverifiedEmailCannotAskToJoin() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String uid = "uid-" + UUID.randomUUID();
        String unverified = TestJwtSupport.unverifiedToken(uid, uid + "@example.com");

        request(token, unverified)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EMAIL_NOT_VERIFIED");
    }


    @Test
    void aMemberAskingToJoinIsToldTheyAreAlreadyIn() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);

        request(token, trip.owner)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ALREADY_A_MEMBER");
    }


    @Test
    void theOwnerSeesTheQueueAndAMemberDoesNot() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        request(token, asker).expectStatus().isOk();

        assertThat(queueSize(trip)).isEqualTo(1);

        rest.get()
                .uri("/v1/itineraries/" + trip.id + "/join-requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void approvalCreatesTheMembershipImmediately() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        request(token, asker).expectStatus().isOk();

        approve(trip, firstRequestId(trip)).expectStatus().isNoContent();

        teaserAs(token, asker).jsonPath("$.viewerState").isEqualTo("member");
        rest.get()
                .uri("/v1/itineraries/" + trip.id)
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void aMemberCannotApprove() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String member = rig.joinAsMember(trip.owner, trip.id, uniqueHandle("member"));
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        request(token, asker).expectStatus().isOk();

        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/join-requests/" + firstRequestId(trip) + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void decliningIsSilentAndTheTravelerMayAskAgain() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        request(token, asker).expectStatus().isOk();

        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/join-requests/" + firstRequestId(trip) + "/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        teaserAs(token, asker).jsonPath("$.viewerState").isEqualTo("canRequest");
        request(token, asker).expectStatus().isOk().expectBody().jsonPath("$.viewerState").isEqualTo("pending");
        assertThat(queueSize(trip)).isEqualTo(1);
    }


    @Test
    void answeringTheSameRequestTwiceIsRefused() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        request(token, asker).expectStatus().isOk();
        String requestId = firstRequestId(trip);
        approve(trip, requestId).expectStatus().isNoContent();

        approve(trip, requestId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }


    @Test
    void approvingVoidsThatTravelersPendingInvitation() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String askerHandle = uniqueHandle("asker");
        String asker = rig.travelerWithHandle(askerHandle);
        request(token, asker).expectStatus().isOk();
        inviteByHandle(trip.owner, trip.id, askerHandle).expectStatus().isCreated();

        approve(trip, firstRequestId(trip)).expectStatus().isNoContent();

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(0);
    }


    @Test
    void acceptingAnInvitationSupersedesAnOpenJoinRequest() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String askerHandle = uniqueHandle("asker");
        String asker = rig.travelerWithHandle(askerHandle);
        request(token, asker).expectStatus().isOk();

        String invitationId =
                fieldIn(
                        inviteByHandle(trip.owner, trip.id, askerHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk();

        assertThat(queueSize(trip))
                .as("membership arrived by the other consent direction, so the open ask is settled")
                .isEqualTo(0);
    }


    @Test
    void aPublishedTripsLinkIsDeadAndRefusesRequests() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        climb(trip, "/start");
        climb(trip, "/complete");
        climb(trip, "/publish");

        teaserAs(token, asker).jsonPath("$.viewerState").isEqualTo("dead");
        request(token, asker)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("JOIN_LINK_CLOSED");
    }


    @Test
    void anArchivedTripsLinkIsDeadToo() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk();

        teaserAs(token, asker).jsonPath("$.viewerState").isEqualTo("dead");
    }


    @Test
    void theDeadTeaserStillCarriesTheTripSoTheLandingCanShowTheDimmedPostcard() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);
        climb(trip, "/start");
        climb(trip, "/complete");
        climb(trip, "/publish");

        rest.get()
                .uri("/v1/join/" + token)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Trip")
                .jsonPath("$.viewerState")
                .isEqualTo("dead");
    }


    @Test
    void aPublishedTripRefusesToHandOutItsLinkAtAll() {
        Trip trip = trip();
        climb(trip, "/start");
        climb(trip, "/complete");
        climb(trip, "/publish");

        rest.get()
                .uri("/v1/itineraries/" + trip.id + "/join-link")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("MEMBERSHIP_FROZEN");
    }


    @Test
    void theCoverIsNotFoundWhenTheTripHasNoneAndUnknownTokensNeverReachIt() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);

        rest.get().uri("/v1/join/" + token + "/cover").exchange().expectStatus().isNotFound();
        rest.get()
                .uri("/v1/join/not-a-real-token/cover")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("JOIN_LINK_NOT_FOUND");
    }


    @Test
    void anAnonymousVisitorReachesTheTeaserWithNoTokenAtAll() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);

        rest.get().uri("/v1/join/" + token).exchange().expectStatus().isOk();
    }


    @Test
    void anAnonymousVisitorCannotAskToJoin() {
        Trip trip = trip();
        String token = tokenOf(trip.owner, trip.id);

        rest.post()
                .uri("/v1/join/" + token + "/request")
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("SIGN_IN_REQUIRED");
    }


    private record Trip(String id, String owner) {}

    private Trip trip() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        return new Trip(rig.createTrip(owner, 1), owner);
    }

    private void climb(Trip trip, String rung) {
        rest.post()
                .uri("/v1/itineraries/" + trip.id + rung)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private byte[] linkBody(String token, String tripId) {
        return rest.get()
                .uri("/v1/itineraries/" + tripId + "/join-link")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private String tokenOf(String token, String tripId) {
        return fieldIn(linkBody(token, tripId), "token");
    }

    private RestTestClient.BodyContentSpec teaserAs(String joinToken, String bearerToken) {
        return rest.get()
                .uri("/v1/join/" + joinToken)
                .header(HttpHeaders.AUTHORIZATION, bearer(bearerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }

    private RestTestClient.ResponseSpec request(String joinToken, String bearerToken) {
        return rest.post()
                .uri("/v1/join/" + joinToken + "/request")
                .header(HttpHeaders.AUTHORIZATION, bearer(bearerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec approve(Trip trip, String requestId) {
        return rest.post()
                .uri("/v1/itineraries/" + trip.id + "/join-requests/" + requestId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange();
    }

    private byte[] queueBody(Trip trip) {
        return rest.get()
                .uri("/v1/itineraries/" + trip.id + "/join-requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private int queueSize(Trip trip) {
        String body = new String(queueBody(trip));
        int count = 0;
        int at = body.indexOf("\"travelerId\"");
        while (at >= 0) {
            count++;
            at = body.indexOf("\"travelerId\"", at + 1);
        }
        return count;
    }

    private String firstRequestId(Trip trip) {
        return fieldIn(queueBody(trip), "id");
    }

    private RestTestClient.ResponseSpec inviteByHandle(String token, String tripId, String handle) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange();
    }

    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
