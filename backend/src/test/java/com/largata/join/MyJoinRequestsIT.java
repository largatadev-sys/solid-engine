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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class MyJoinRequestsIT extends PostgresTestBase {

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
    void aPendingRequestComesBackToTheTravelerWhoMadeIt() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);

        mine(asker)
                .jsonPath("$.items.length()")
                .isEqualTo(1)
                .jsonPath("$.items[0].itineraryId")
                .isEqualTo(trip.id);
    }


    @Test
    void itCarriesTheTripsContextSoTheCardCanRenderWithoutASecondCall() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);

        mine(asker)
                .jsonPath("$.items[0].tripTitle")
                .isNotEmpty()
                .jsonPath("$.items[0].travelerCount")
                .isEqualTo(1)
                .jsonPath("$.items[0].requestedAt")
                .isNotEmpty();
    }


    @Test
    void itNeverCarriesTheRosterOrThePlanOfATripTheAskerIsNotOnYet() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);

        String body = new String(mineBody(asker));

        assertThat(body).doesNotContain("\"days\"").doesNotContain("\"activities\"");
        assertThat(body).doesNotContain("@example.com");
    }


    @Test
    void oneTravelerNeverSeesAnothersAsk() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        String other = rig.travelerWithHandle(uniqueHandle("other"));
        askToJoin(trip, asker);

        mine(other).jsonPath("$.items.length()").isEqualTo(0);
    }


    @Test
    void anApprovedAskLeavesTheListingBecauseTheTripIsNowSimplyTheirs() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        approve(trip, firstRequestId(trip));

        mine(asker).jsonPath("$.items.length()").isEqualTo(0);
    }


    @Test
    void aDeclinedAskLeavesTheListingToo() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        decline(trip, firstRequestId(trip));

        mine(asker).jsonPath("$.items.length()").isEqualTo(0);
    }


    @Test
    void withdrawingClearsTheCardAndEmptiesTheOwnersQueue() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        String requestId = firstRequestId(trip);

        withdraw(asker, requestId).expectStatus().isNoContent();

        mine(asker).jsonPath("$.items.length()").isEqualTo(0);
        assertThat(queueSize(trip)).isZero();
    }


    @Test
    void aWithdrawnTravelerMayAskAgainThroughTheSameLink() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        withdraw(asker, firstRequestId(trip)).expectStatus().isNoContent();

        askToJoin(trip, asker);

        mine(asker).jsonPath("$.items.length()").isEqualTo(1);
        assertThat(queueSize(trip)).isEqualTo(1);
    }


    @Test
    void nobodyElseCanWithdrawSomeoneElsesAsk() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        String meddler = rig.travelerWithHandle(uniqueHandle("meddler"));
        askToJoin(trip, asker);
        String requestId = firstRequestId(trip);

        withdraw(meddler, requestId).expectStatus().isNotFound();

        assertThat(queueSize(trip)).isEqualTo(1);
    }


    @Test
    void noteventheOwnerCanWithdrawTheAskOnTheAskersBehalf() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);

        withdraw(trip.owner, firstRequestId(trip)).expectStatus().isNotFound();
    }


    @Test
    void anAlreadyAnsweredAskCannotBeWithdrawn() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        String requestId = firstRequestId(trip);
        decline(trip, requestId);

        withdraw(asker, requestId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }


    @Test
    void theCoverIsRefusedOnceTheAskIsNoLongerPending() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        askToJoin(trip, asker);
        String requestId = firstRequestId(trip);
        withdraw(asker, requestId).expectStatus().isNoContent();

        cover(asker, requestId).expectStatus().isNotFound();
    }


    @Test
    void theCoverIsRefusedToAnyoneButTheAsker() {
        Trip trip = trip();
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        String meddler = rig.travelerWithHandle(uniqueHandle("meddler"));
        askToJoin(trip, asker);

        cover(meddler, firstRequestId(trip)).expectStatus().isNotFound();
    }


    @Test
    void theListingIsAuthenticated() {
        rest.get().uri("/v1/join-requests").exchange().expectStatus().isUnauthorized();
    }


    private void askToJoin(Trip trip, String asker) {
        rest.post()
                .uri("/v1/join/" + tokenOf(trip) + "/request")
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private RestTestClient.BodyContentSpec mine(String traveler) {
        return rest.get()
                .uri("/v1/join-requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }


    private byte[] mineBody(String traveler) {
        return mine(traveler).returnResult().getResponseBodyContent();
    }


    private RestTestClient.ResponseSpec withdraw(String traveler, String requestId) {
        return rest.delete()
                .uri("/v1/join-requests/" + requestId)
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler))
                .exchange();
    }


    private RestTestClient.ResponseSpec cover(String traveler, String requestId) {
        return rest.get()
                .uri("/v1/join-requests/" + requestId + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler))
                .exchange();
    }


    private void approve(Trip trip, String requestId) {
        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/join-requests/" + requestId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void decline(Trip trip, String requestId) {
        rest.post()
                .uri("/v1/itineraries/" + trip.id + "/join-requests/" + requestId + "/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private String tokenOf(Trip trip) {
        return fieldIn(
                rest.get()
                        .uri("/v1/itineraries/" + trip.id + "/join-link")
                        .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "token");
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


    private Trip trip() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        return new Trip(rig.createTrip(owner, 1), owner);
    }


    private record Trip(String id, String owner) {}


    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
