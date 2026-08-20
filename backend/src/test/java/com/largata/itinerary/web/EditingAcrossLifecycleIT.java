package com.largata.itinerary.web;

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
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class EditingAcrossLifecycleIT extends PostgresTestBase {

    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rig = new TripRig(
                RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build(), jdbc);
    }


    @Test
    void anUpcomingTripEditsInPlace_planningIsNotAStateToLeave() {
        editsLandAndTheStateHoldsAt("upcoming");
    }


    @Test
    void aTripBeingLivedEditsInPlace_theMidTripCorrectionCostsNoState() {
        editsLandAndTheStateHoldsAt("ongoing", "start");
    }


    @Test
    void anUnpublishedCompletedTripEditsInPlace_completionMeansItHappenedNotItIsLocked() {
        editsLandAndTheStateHoldsAt("completed", "start", "complete");
    }


    @Test
    void aMemberEditsAtEveryUnpublishedRung_theEditIsNotTheOwnersToMake() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        walk(owner, tripId, "start");

        UUID dayOne = rig.dayAt(tripId, 1);
        long base = rig.planVersionOf(member, tripId);
        rig.hold(member, tripId, "session", null);

        savePlan(member, tripId, planWithOneDayTitled(base, dayOne, "A member fixes the plan"))
                .expectStatus()
                .isOk();

        assertThat(stateOf(owner, tripId)).isEqualTo("ongoing");
    }


    @Test
    void publishingIsWhatFreezesThePlan_notAnyLifecycleRung() {
        bothSessionAndSaveRefuseWith(
                "publish", "ITINERARY_PUBLISHED", "start", "complete");
    }


    @Test
    void archivingFreezesEveryRungToo_includingTheOnesEditingInPlaceOpened() {
        bothSessionAndSaveRefuseWith("archive", "TRIP_ARCHIVED", "start");
    }


    private void bothSessionAndSaveRefuseWith(String fenceAct, String code, String... ladder) {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        walk(owner, tripId, ladder);
        long base = rig.planVersionOf(owner, tripId);
        rig.hold(owner, tripId, "session", null);
        walk(owner, tripId, fenceAct);

        assertThat(refusalCode(rig.acquire(owner, tripId, "session", null)))
                .as("the session is refused once %s has frozen the trip", fenceAct)
                .isEqualTo(code);
        assertThat(
                        refusalCode(
                                savePlan(
                                        owner,
                                        tripId,
                                        planWithOneDayTitled(base, dayOne, "Into a frozen trip"))))
                .as("and so is the save, from a session taken before the freeze")
                .isEqualTo(code);
    }


    private static String refusalCode(RestTestClient.ResponseSpec response) {
        return TripRig.fieldIn(
                response.expectStatus().isEqualTo(409).expectBody().returnResult().getResponseBodyContent(),
                "code");
    }


    private void editsLandAndTheStateHoldsAt(String expectedState, String... ladder) {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        walk(owner, tripId, ladder);
        assertThat(stateOf(owner, tripId)).isEqualTo(expectedState);

        long base = rig.planVersionOf(owner, tripId);
        rig.acquire(owner, tripId, "session", null).expectStatus().isOk();

        savePlan(owner, tripId, planWithOneDayTitled(base, dayOne, "Edited at " + expectedState))
                .expectStatus()
                .isOk();

        assertThat(rig.planVersionOf(owner, tripId)).isEqualTo(base + 1);
        assertThat(stateOf(owner, tripId))
                .as("editing in place costs no state")
                .isEqualTo(expectedState);
    }


    private void walk(String token, String tripId, String... acts) {
        for (String act : acts) {
            rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/" + act, token, null)
                    .expectStatus()
                    .isOk();
        }
    }


    private String stateOf(String token, String tripId) {
        return TripRig.fieldIn(rig.readTrip(token, tripId), "state");
    }


    private RestTestClient.ResponseSpec savePlan(String token, String tripId, String body) {
        return rig.send(HttpMethod.PUT, "/v1/itineraries/" + tripId + "/plan", token, body);
    }


    private static String planWithOneDayTitled(long base, UUID dayId, String title) {
        return """
                {"basePlanVersion": %d, "days": [{"id": "%s", "title": "%s", "activities": []}]}
                """
                .formatted(base, dayId, title);
    }


    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
