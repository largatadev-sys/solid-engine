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
class PlanVersionBumpIT extends PostgresTestBase {

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
    void aFreshTripStartsAtVersionZero() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);

        assertThat(rig.planVersionOf(owner, tripId))
                .as("no plan write has happened yet, and the seeded days are the plan's starting shape")
                .isZero();
    }

    @Test
    void everyPerActionPlanEndpointBumpsExactlyOncePerWrite() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID dayTwo = rig.dayAt(tripId, 2);

        long afterAppend = bumpedBy(owner, tripId, () ->
                rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", owner, "{}")
                        .expectStatus()
                        .isCreated());
        assertThat(afterAppend).as("append day").isEqualTo(1);

        rig.hold(owner, tripId, "day", dayOne);
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.PATCH,
                                        "/v1/itineraries/" + tripId + "/days/" + dayOne,
                                        owner,
                                        "{\"title\":\"Arrival\"}")
                                .expectStatus()
                                .isOk()))
                .as("rename day")
                .isEqualTo(1);

        UUID[] created = new UUID[1];
        assertThat(bumpedBy(owner, tripId, () ->
                        created[0] = rig.addActivity(owner, tripId, dayOne, "Snorkelling")))
                .as("create activity")
                .isEqualTo(1);
        UUID activityId = created[0];

        rig.hold(owner, tripId, "activity", activityId);
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.PATCH,
                                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId,
                                        owner,
                                        "{\"title\":\"Snorkelling, edited\"}")
                                .expectStatus()
                                .isOk()))
                .as("edit activity")
                .isEqualTo(1);

        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.POST,
                                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId + "/move",
                                        owner,
                                        "{\"targetDayId\":\"" + dayTwo + "\"}")
                                .expectStatus()
                                .isOk()))
                .as("move activity across days")
                .isEqualTo(1);

        UUID first = rig.addActivity(owner, tripId, dayOne, "First");
        UUID second = rig.addActivity(owner, tripId, dayOne, "Second");
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.PUT,
                                        TripRig.activitiesUri(tripId, dayOne) + "/order",
                                        owner,
                                        "{\"expectedActivityIds\":[\"" + first + "\",\"" + second + "\"],"
                                                + "\"activityIds\":[\"" + second + "\",\"" + first + "\"]}")
                                .expectStatus()
                                .isOk()))
                .as("reorder activities")
                .isEqualTo(1);

        rig.hold(owner, tripId, "activity", first);
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + first, owner, null)
                                .expectStatus()
                                .isNoContent()))
                .as("delete activity")
                .isEqualTo(1);

        rig.hold(owner, tripId, "day", dayOne);
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, null)
                                .expectStatus()
                                .isNoContent()))
                .as("delete day, activities and all")
                .isEqualTo(1);
    }

    @Test
    void readsAndNonPlanWritesLeaveTheVersionAlone() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);

        assertThat(bumpedBy(owner, tripId, () -> rig.readTrip(owner, tripId)))
                .as("reading the plan is not writing it")
                .isZero();

        rig.hold(owner, tripId, "header", null);
        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.PATCH,
                                        "/v1/itineraries/" + tripId,
                                        owner,
                                        "{\"title\":\"Renamed\",\"destination\":\"Cebu\"}")
                                .expectStatus()
                                .isOk()))
                .as("a trip-field edit changes the itinerary, never the plan document a buffered save would replace")
                .isZero();

        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/start", owner, null)
                                .expectStatus()
                                .isOk()))
                .as("a lifecycle transition moves the trip, not the plan")
                .isZero();
    }

    @Test
    void aRefusedPlanWriteLeavesTheVersionWhereItWas() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Untouched");

        assertThat(bumpedBy(owner, tripId, () ->
                        rig.send(
                                        HttpMethod.PATCH,
                                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId,
                                        owner,
                                        "{\"title\":\"Refused, no lease\"}")
                                .expectStatus()
                                .isEqualTo(409)))
                .as("the bump rides the transaction, exactly as capture does")
                .isZero();
    }


    private long bumpedBy(String token, String tripId, Runnable write) {
        long before = rig.planVersionOf(token, tripId);
        write.run();
        return rig.planVersionOf(token, tripId) - before;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
