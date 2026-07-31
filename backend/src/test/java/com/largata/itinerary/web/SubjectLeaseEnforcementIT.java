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
class SubjectLeaseEnforcementIT extends PostgresTestBase {

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
    void addsNeedNoLeaseBecauseAdditionsCommute() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        UUID dayOne = rig.dayAt(tripId, 1);

        rig.hold(member, tripId, "day", dayOne);
        rig.hold(member, tripId, "header", null);

        rig.send(HttpMethod.POST, TripRig.activitiesUri(tripId, dayOne), owner, "{\"title\":\"Added anyway\"}")
                .expectStatus()
                .isCreated();
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", owner, "{}")
                .expectStatus()
                .isCreated();
    }

    @Test
    void anActivityEditDemandsThatActivitysOwnLeaseAndNamesTheHolder() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID contested = rig.addActivity(owner, tripId, dayOne, "Contested");

        rig.hold(holder, tripId, "activity", contested);

        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + contested,
                        owner,
                        "{\"title\":\"Mine now\"}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED")
                .jsonPath("$.message")
                .value(message -> assertThat((String) message).contains("@" + holderHandle));
    }

    @Test
    void holdingOneActivityAuthorizesNothingAboutTheOneBesideIt() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID held = rig.addActivity(owner, tripId, dayOne, "Held");
        UUID other = rig.addActivity(owner, tripId, dayOne, "Other");

        rig.hold(owner, tripId, "activity", held);

        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + other,
                        owner,
                        "{\"title\":\"Not covered\"}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");
        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + held,
                        owner,
                        "{\"title\":\"Covered\"}")
                .expectStatus()
                .isOk();
    }

    @Test
    void anActivityDeleteDemandsThatActivitysLease() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID doomed = rig.addActivity(owner, tripId, dayOne, "Doomed");

        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + doomed, owner, null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");

        rig.hold(owner, tripId, "activity", doomed);
        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + doomed, owner, null)
                .expectStatus()
                .isNoContent();
    }

    @Test
    void aDayRenameDemandsThatDaysLease() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID dayTwo = rig.dayAt(tripId, 2);

        rig.hold(owner, tripId, "day", dayTwo);

        rig.send(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, "{\"title\":\"x\"}")
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayTwo, owner, "{\"title\":\"x\"}")
                .expectStatus()
                .isOk();
    }

    @Test
    void tripFieldEditsDemandTheHeaderLeaseAndAConcurrentOneIsRefused() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());

        rig.hold(member, tripId, "header", null);

        rig.send(
                        HttpMethod.PATCH,
                        "/v1/itineraries/" + tripId,
                        owner,
                        "{\"title\":\"Renamed\",\"destinations\":[\"Cebu\"]}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EDIT_LOCKED");

        rig.releaseLease(member, tripId, "header", null).expectStatus().isNoContent();
        rig.hold(owner, tripId, "header", null);
        rig.send(
                        HttpMethod.PATCH,
                        "/v1/itineraries/" + tripId,
                        owner,
                        "{\"title\":\"Renamed\",\"destinations\":[\"Cebu\"]}")
                .expectStatus()
                .isOk();
    }

    @Test
    void aLeaseCannotBeTakenOnASubjectOfSomebodyElsesTrip() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle("stray" + suffix());
        UUID foreignDay = rig.dayAt(rig.createTrip(stranger, 1), 1);

        rig.acquire(owner, tripId, "day", foreignDay).expectStatus().isNotFound();
    }


    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
