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
class EditingSessionIT extends PostgresTestBase {

    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rig =
                new TripRig(
                        RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build(), jdbc);
    }

    @Test
    void theSessionIsAcquiredAndReleasedByItsHolder() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);

        rig.acquire(owner, tripId, "session", null).expectStatus().isOk();
        rig.releaseLease(owner, tripId, "session", null).expectStatus().isNoContent();
        rig.acquire(owner, tripId, "session", null).expectStatus().isOk();
    }

    @Test
    void aSecondTravelerIsRefusedTheSessionAndToldWhoHoldsIt() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);

        rig.hold(holder, tripId, "session", null);

        rig.acquire(owner, tripId, "session", null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED")
                .jsonPath("$.message")
                .value(message -> assertThat((String) message).contains("@" + holderHandle));
    }

    @Test
    void aMidEditSubjectLeaseBlocksTheSessionRatherThanBeingSteamrolled() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Mid-edit");

        rig.hold(holder, tripId, "activity", activityId);

        rig.acquire(owner, tripId, "session", null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED")
                .jsonPath("$.message")
                .value(message -> assertThat((String) message).contains("@" + holderHandle));
    }

    @Test
    void theSessionBlocksASubjectLeaseTheOtherWayRound() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        UUID dayOne = rig.dayAt(tripId, 1);

        rig.hold(owner, tripId, "session", null);

        rig.acquire(member, tripId, "day", dayOne)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");
        rig.acquire(member, tripId, "header", null).expectStatus().isEqualTo(409);
    }

    @Test
    void theHoldersOwnWritesNeedNoPerSubjectLease() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Subsumed");

        rig.hold(owner, tripId, "session", null);

        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId,
                        owner,
                        "{\"title\":\"Edited inside the session\"}")
                .expectStatus()
                .isOk();
        rig.send(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, "{\"title\":\"Renamed\"}")
                .expectStatus()
                .isOk();
        rig.send(
                        HttpMethod.PATCH,
                        "/v1/itineraries/" + tripId,
                        owner,
                        "{\"title\":\"Header inside the session\",\"destinations\":[\"Cebu\"]}")
                .expectStatus()
                .isOk();
        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + activityId, owner, null)
                .expectStatus()
                .isNoContent();
    }

    @Test
    void aNonHoldersPlanWritesRefuseWhileTheSessionIsHeld() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Contested");

        rig.hold(holder, tripId, "session", null);

        rig.send(HttpMethod.POST, TripRig.activitiesUri(tripId, dayOne), owner, "{\"title\":\"Blocked add\"}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED")
                .jsonPath("$.message")
                .value(message -> assertThat((String) message).contains("@" + holderHandle));
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", owner, "{}")
                .expectStatus()
                .isEqualTo(409);
        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId,
                        owner,
                        "{\"title\":\"Blocked edit\"}")
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, "{\"title\":\"x\"}")
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, null)
                .expectStatus()
                .isEqualTo(409);
    }

    @Test
    void membershipActsStayUnaffectedWhileTheSessionIsHeld() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holder = rig.joinAsMember(owner, tripId, "holder" + suffix());

        rig.hold(holder, tripId, "session", null);

        rig.send(
                        HttpMethod.POST,
                        "/v1/itineraries/" + tripId + "/invitations",
                        owner,
                        "{\"email\":\"invitee-" + suffix() + "@example.com\"}")
                .expectStatus()
                .isCreated();
    }

    @Test
    void theAdvisoryReadNamesTheSessionHolderOnThePlan() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);

        rig.hold(holder, tripId, "session", null);

        rig.send(HttpMethod.GET, "/v1/itineraries/" + tripId, owner, null)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.editingSession.handle")
                .isEqualTo(holderHandle);
    }

    @Test
    void thePlanReportsNoSessionWhenNobodyHoldsOne() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);

        rig.send(HttpMethod.GET, "/v1/itineraries/" + tripId, owner, null)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.editingSession")
                .doesNotExist();
    }

    @Test
    void theSessionRenewsWhileTheEditorStaysOpen() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);

        rig.hold(owner, tripId, "session", null);

        rig.send(HttpMethod.POST, TripRig.lockUri(tripId) + "/renew", owner, "{\"subjectType\":\"session\"}")
                .expectStatus()
                .isOk();
    }

    @Test
    void anArchivedTripRefusesTheSessionBeforeAnyLeaseQuestionIsAsked() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);

        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/archive", owner, null)
                .expectStatus()
                .isOk();

        rig.acquire(owner, tripId, "session", null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_ARCHIVED");
    }

    @Test
    void aStrangerCannotTakeTheSessionOnSomebodyElsesTrip() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle("stray" + suffix());

        rig.acquire(stranger, tripId, "session", null).expectStatus().isNotFound();
    }


    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
