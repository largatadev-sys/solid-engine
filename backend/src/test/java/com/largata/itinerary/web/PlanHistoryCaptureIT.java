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
class PlanHistoryCaptureIT extends PostgresTestBase {

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
    void everyPlanWriteFamilyLeavesExactlyOneAttributedEntryBehindIt() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        UUID travelerId = rig.travelerIdOf(owner);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID dayTwo = rig.dayAt(tripId, 2);

        UUID first = rig.addActivity(owner, tripId, dayOne, "First");
        UUID second = rig.addActivity(owner, tripId, dayOne, "Second");

        rig.hold(owner, tripId, "header", null);
        rig.send(
                        HttpMethod.PATCH,
                        "/v1/itineraries/" + tripId,
                        owner,
                        "{\"title\":\"Renamed\",\"destinations\":[\"Cebu\"]}")
                .expectStatus()
                .isOk();

        rig.hold(owner, tripId, "day", dayOne);
        rig.send(HttpMethod.PATCH, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, "{\"title\":\"Arrival\"}")
                .expectStatus()
                .isOk();

        rig.hold(owner, tripId, "activity", first);
        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + first,
                        owner,
                        "{\"title\":\"First, edited\"}")
                .expectStatus()
                .isOk();
        rig.send(
                        HttpMethod.POST,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + first + "/move",
                        owner,
                        "{\"targetDayId\":\"" + dayTwo + "\"}")
                .expectStatus()
                .isOk();

        rig.send(
                        HttpMethod.PUT,
                        TripRig.activitiesUri(tripId, dayOne) + "/order",
                        owner,
                        "{\"expectedActivityIds\":[\"" + second + "\"],\"activityIds\":[\"" + second + "\"]}")
                .expectStatus()
                .isOk();

        rig.hold(owner, tripId, "activity", second);
        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + second, owner, null)
                .expectStatus()
                .isNoContent();

        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", owner, "{}")
                .expectStatus()
                .isCreated();
        rig.hold(owner, tripId, "day", dayOne);
        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayOne, owner, null)
                .expectStatus()
                .isNoContent();

        assertThat(rig.historyActs(tripId))
                .as("one row per plan write, in the order they happened")
                .containsExactly(
                        "ACTIVITY_ADDED",
                        "ACTIVITY_ADDED",
                        "HEADER_EDITED",
                        "DAY_RENAMED",
                        "ACTIVITY_EDITED",
                        "ACTIVITY_MOVED",
                        "ACTIVITIES_REORDERED",
                        "ACTIVITY_DELETED",
                        "DAY_ADDED",
                        "DAY_DELETED");
        assertThat(actorIds(tripId)).as("every entry is attributed").containsOnly(travelerId);
    }

    @Test
    void aRefusedWriteLeavesNoTraceBecauseCaptureRidesTheTransaction() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Untouched");

        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + activityId,
                        owner,
                        "{\"title\":\"Refused, no lease\"}")
                .expectStatus()
                .isEqualTo(409);

        assertThat(rig.historyActs(tripId))
                .as("the add is recorded; the refused edit is not")
                .containsExactly("ACTIVITY_ADDED");
    }

    @Test
    void anEntryOutlivesTheActivityItDescribes() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID doomed = rig.addActivity(owner, tripId, dayOne, "Doomed");

        rig.hold(owner, tripId, "activity", doomed);
        rig.send(HttpMethod.DELETE, TripRig.activitiesUri(tripId, dayOne) + "/" + doomed, owner, null)
                .expectStatus()
                .isNoContent();

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM activity_history WHERE subject_id = ?",
                                Integer.class,
                                doomed))
                .as("history is what survives deletion — the point of capturing it")
                .isEqualTo(2);
    }


    private java.util.List<UUID> actorIds(String tripId) {
        return jdbc.queryForList(
                "SELECT actor_id FROM activity_history WHERE itinerary_id = ?",
                UUID.class,
                UUID.fromString(tripId));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
