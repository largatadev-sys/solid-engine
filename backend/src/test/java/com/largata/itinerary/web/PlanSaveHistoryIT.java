package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.List;
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
class PlanSaveHistoryIT extends PostgresTestBase {

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
    void aMixedSaveLeavesExactlyTheDiffsEntriesAttributedToTheSaver() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID travelerId = rig.travelerIdOf(owner);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID renamedTarget = rig.addActivity(owner, tripId, dayOne, "To be edited");
        UUID doomed = rig.addActivity(owner, tripId, dayOne, "To be deleted");
        UUID stayer = rig.addActivity(owner, tripId, dayOne, "Stays, but moves up the list");
        long base = rig.planVersionOf(owner, tripId);
        int before = rig.historyActs(tripId).size();

        rig.hold(owner, tripId, "session", null);
        save(owner, tripId, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "title": "Renamed in the buffer", "activities": [
                    {"id": "%s", "fields": {"title": "Stays, but moves up the list"}},
                    {"id": "%s", "fields": {"title": "Edited in the buffer"}},
                    {"fields": {"title": "Created in the buffer"}}
                  ]},
                  {"title": "Appended in the buffer", "activities": []}
                ]}
                """.formatted(base, dayOne, stayer, renamedTarget))
                .expectStatus()
                .isOk();

        assertThat(actsSince(tripId, before))
                .as("one entry per real change, and nothing for what did not move")
                .containsExactlyInAnyOrder(
                        "DAY_RENAMED",
                        "ACTIVITY_EDITED",
                        "ACTIVITY_ADDED",
                        "ACTIVITIES_REORDERED",
                        "DAY_ADDED",
                        "ACTIVITY_DELETED");
        assertThat(actorIdsSince(tripId, before))
                .as("the exclusive session means one holder per save, so attribution loses nothing")
                .containsOnly(travelerId);
        assertThat(doomed).isNotNull();
    }

    @Test
    void aDayRenamedTwiceBeforeSavingLeavesOneEntry() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        long base = rig.planVersionOf(owner, tripId);
        int before = rig.historyActs(tripId).size();

        rig.hold(owner, tripId, "session", null);
        save(owner, tripId, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "title": "Renamed twice, saved once", "activities": []}
                ]}
                """.formatted(base, dayOne))
                .expectStatus()
                .isOk();

        assertThat(actsSince(tripId, before))
                .as("the diff sees endpoints, not the path — the churn between them was never submitted, "
                        + "so the server cannot narrate it and does not try")
                .containsExactly("DAY_RENAMED");
    }

    @Test
    void aReorderOnlySaveEmitsTheReorderAndANoOpSaveEmitsNothing() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID first = rig.addActivity(owner, tripId, dayOne, "First");
        UUID second = rig.addActivity(owner, tripId, dayOne, "Second");

        rig.hold(owner, tripId, "session", null);
        long base = rig.planVersionOf(owner, tripId);
        int beforeReorder = rig.historyActs(tripId).size();
        save(owner, tripId, twoActivityDay(base, dayOne, second, "Second", first, "First"))
                .expectStatus()
                .isOk();
        assertThat(actsSince(tripId, beforeReorder)).containsExactly("ACTIVITIES_REORDERED");

        long afterReorder = rig.planVersionOf(owner, tripId);
        int beforeNoOp = rig.historyActs(tripId).size();
        save(owner, tripId, twoActivityDay(afterReorder, dayOne, second, "Second", first, "First"))
                .expectStatus()
                .isOk();
        assertThat(actsSince(tripId, beforeNoOp))
                .as("a submitted plan identical to the committed one changed nothing, so it narrates nothing")
                .isEmpty();
    }

    @Test
    void anActivityLandingOnADifferentDayIsTheCapturesMoveEntry() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID dayTwo = rig.dayAt(tripId, 2);
        UUID traveller = rig.addActivity(owner, tripId, dayOne, "Changes day");
        long base = rig.planVersionOf(owner, tripId);
        int before = rig.historyActs(tripId).size();

        rig.hold(owner, tripId, "session", null);
        save(owner, tripId, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "activities": []},
                  {"id": "%s", "activities": [{"id": "%s", "fields": {"title": "Changes day"}}]}
                ]}
                """.formatted(base, dayOne, dayTwo, traveller))
                .expectStatus()
                .isOk();

        assertThat(actsSince(tripId, before))
                .as("the wire permits a same-id day change even though no S4.18 UI stages one")
                .containsExactly("ACTIVITY_MOVED");
    }

    @Test
    void aPerActionWriteAndADiffDerivedWriteOfTheSameOpLeaveTheSameEntryShape() {
        String owner = rig.travelerWithHandle("owner" + suffix());

        String perAction = rig.createTrip(owner, 1);
        UUID perActionDay = rig.dayAt(perAction, 1);
        rig.hold(owner, perAction, "day", perActionDay);
        rig.send(
                        HttpMethod.PATCH,
                        "/v1/itineraries/" + perAction + "/days/" + perActionDay,
                        owner,
                        "{\"title\":\"Arrival\"}")
                .expectStatus()
                .isOk();

        String buffered = rig.createTrip(owner, 1);
        UUID bufferedDay = rig.dayAt(buffered, 1);
        rig.hold(owner, buffered, "session", null);
        save(owner, buffered, """
                {"basePlanVersion": %d, "days": [{"id": "%s", "title": "Arrival", "activities": []}]}
                """.formatted(rig.planVersionOf(owner, buffered), bufferedDay))
                .expectStatus()
                .isOk();

        assertThat(entryShapesOf(buffered))
                .as("S4.10 inherits no format fork — capture cannot be backfilled, so this must match today")
                .isEqualTo(entryShapesOf(perAction));
    }

    @Test
    void aFailedSaveCapturesNothingBecauseTheDiffRidesItsTransaction() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        long base = rig.planVersionOf(owner, tripId);
        int before = rig.historyActs(tripId).size();

        rig.hold(owner, tripId, "session", null);
        save(owner, tripId, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "title": "A rename that dies with the request", "activities": [
                    {"fields": {"title": "Malformed", "costAmount": "500", "costCurrency": ""}}
                  ]}
                ]}
                """.formatted(base, dayOne))
                .expectStatus()
                .is4xxClientError();

        assertThat(actsSince(tripId, before)).isEmpty();
    }


    private RestTestClient.ResponseSpec save(String token, String tripId, String body) {
        return rig.send(HttpMethod.PUT, "/v1/itineraries/" + tripId + "/plan", token, body);
    }

    private static String twoActivityDay(
            long base, UUID dayId, UUID firstId, String firstTitle, UUID secondId, String secondTitle) {
        return """
                {"basePlanVersion": %d, "days": [{"id": "%s", "activities": [
                  {"id": "%s", "fields": {"title": "%s"}},
                  {"id": "%s", "fields": {"title": "%s"}}
                ]}]}
                """.formatted(base, dayId, firstId, firstTitle, secondId, secondTitle);
    }

    private List<String> actsSince(String tripId, int already) {
        List<String> acts = rig.historyActs(tripId);
        return acts.subList(already, acts.size());
    }

    private List<UUID> actorIdsSince(String tripId, int already) {
        List<UUID> actors =
                jdbc.queryForList(
                        "SELECT actor_id FROM activity_history WHERE itinerary_id = ? ORDER BY id",
                        UUID.class,
                        UUID.fromString(tripId));
        return actors.subList(already, actors.size());
    }

    private List<String> entryShapesOf(String tripId) {
        return jdbc.queryForList(
                "SELECT act || ' on ' || subject_type || CASE WHEN subject_id IS NULL THEN ' (none)' ELSE '' END "
                        + "FROM activity_history WHERE itinerary_id = ? ORDER BY id",
                String.class,
                UUID.fromString(tripId));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
