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
class PlanSaveIT extends PostgresTestBase {

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
    void oneCallLandsAWholeSessionOfMixedEdits() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID dayTwo = rig.dayAt(tripId, 2);
        UUID kept = rig.addActivity(owner, tripId, dayOne, "Kept");
        UUID edited = rig.addActivity(owner, tripId, dayOne, "To be edited");
        UUID doomed = rig.addActivity(owner, tripId, dayOne, "To be deleted");
        long base = rig.planVersionOf(owner, tripId);

        rig.hold(owner, tripId, "session", null);
        savePlan(owner, tripId, base, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "title": "Arrival", "activities": [
                    {"id": "%s", "fields": {"title": "Edited in the buffer"}},
                    {"id": "%s", "fields": {"title": "Kept"}},
                    {"fields": {"title": "Staged from nothing"}}
                  ]},
                  {"title": "A day appended in the buffer", "activities": []}
                ]}
                """.formatted(base, dayOne, edited, kept))
                .expectStatus()
                .isOk();

        byte[] reread = rig.readTrip(owner, tripId);
        String json = new String(reread);
        assertThat(json).as("the edit landed").contains("Edited in the buffer");
        assertThat(json).as("the staged creation landed").contains("Staged from nothing");
        assertThat(json).as("the appended day landed").contains("A day appended in the buffer");
        assertThat(json).as("the activity absent from the submitted plan is gone").doesNotContain("To be deleted");
        assertThat(json)
                .as("the day absent from the submitted plan is gone, day two having been dropped")
                .doesNotContain(dayTwo.toString());
        assertThat(activityTitlesOf(dayOne))
                .as("array order is the order — the reorder rode the same call")
                .containsExactly("Edited in the buffer", "Kept", "Staged from nothing");
        assertThat(rig.planVersionOf(owner, tripId)).as("one write, one bump").isEqualTo(base + 1);
        assertThat(doomed).isNotNull();
    }

    @Test
    void aStaleBaseIsRefusedByNameAndCarriesTheVersionToRebaseOn() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        long staleBase = rig.planVersionOf(owner, tripId);

        rig.addActivity(owner, tripId, dayOne, "The write that moved the plan on");
        long current = rig.planVersionOf(owner, tripId);
        assertThat(current).as("the plan moved while the buffer was held").isGreaterThan(staleBase);

        rig.hold(owner, tripId, "session", null);
        byte[] refusal =
                savePlan(owner, tripId, staleBase, planWithOneDayTitled(staleBase, dayOne, "Saved from a stale buffer"))
                        .expectStatus()
                        .isEqualTo(409)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(TripRig.fieldIn(refusal, "code")).isEqualTo("STALE_PLAN");
        assertThat(Long.parseLong(TripRig.numberIn(refusal, "currentPlanVersion")))
                .as("the refusal hands back the version to re-base on, so the overwrite needs no force flag")
                .isEqualTo(current);
        assertThat(new String(rig.readTrip(owner, tripId)))
                .as("a refused save changes nothing")
                .doesNotContain("Saved from a stale buffer");

        savePlan(owner, tripId, current, planWithOneDayTitled(current, dayOne, "Saved from a stale buffer"))
                .expectStatus()
                .isOk();
        assertThat(new String(rig.readTrip(owner, tripId)))
                .as("re-submitting against the carried version is the whole overwrite path")
                .contains("Saved from a stale buffer");
    }

    @Test
    void onlyTheSessionHolderMaySave() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        UUID dayOne = rig.dayAt(tripId, 1);
        long base = rig.planVersionOf(owner, tripId);

        byte[] withNoSessionAtAll =
                savePlan(owner, tripId, base, planWithOneDayTitled(base, dayOne, "No session held"))
                        .expectStatus()
                        .isEqualTo(409)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        assertThat(TripRig.fieldIn(withNoSessionAtAll, "code"))
                .as("the bulk save is holder-only — not holding is not the same as being unopposed")
                .isEqualTo("EDIT_LOCKED");

        rig.hold(owner, tripId, "session", null);
        byte[] foreign =
                savePlan(member, tripId, base, planWithOneDayTitled(base, dayOne, "Not my session"))
                        .expectStatus()
                        .isEqualTo(409)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        assertThat(TripRig.fieldIn(foreign, "code")).isEqualTo("EDIT_LOCKED");
        assertThat(new String(foreign)).as("the refusal names the holder").contains("owner");
        assertThat(rig.planVersionOf(owner, tripId)).as("neither refusal wrote").isEqualTo(base);
    }

    @Test
    void theBulkPathInheritsTheWholeWriteRegime() {
        String archivedOwner = rig.travelerWithHandle("owner" + suffix());
        String archived = rig.createTrip(archivedOwner, 1);
        UUID archivedDay = rig.dayAt(archived, 1);
        long archivedBase = rig.planVersionOf(archivedOwner, archived);
        rig.hold(archivedOwner, archived, "session", null);
        rig.send(HttpMethod.POST, "/v1/itineraries/" + archived + "/archive", archivedOwner, null)
                .expectStatus()
                .isOk();

        byte[] archivedRefusal =
                savePlan(
                                archivedOwner,
                                archived,
                                archivedBase,
                                planWithOneDayTitled(archivedBase, archivedDay, "Into an archived trip"))
                        .expectStatus()
                        .isEqualTo(409)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        assertThat(TripRig.fieldIn(archivedRefusal, "code")).isEqualTo("TRIP_ARCHIVED");

        String publishedOwner = rig.travelerWithHandle("owner" + suffix());
        String published = rig.createTrip(publishedOwner, 1);
        UUID publishedDay = rig.dayAt(published, 1);
        long publishedBase = rig.planVersionOf(publishedOwner, published);
        rig.hold(publishedOwner, published, "session", null);
        publish(publishedOwner, published);

        byte[] publishedRefusal =
                savePlan(
                                publishedOwner,
                                published,
                                publishedBase,
                                planWithOneDayTitled(publishedBase, publishedDay, "Into a published trip"))
                        .expectStatus()
                        .isEqualTo(409)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        assertThat(TripRig.fieldIn(publishedRefusal, "code")).isEqualTo("ITINERARY_PUBLISHED");
    }

    @Test
    void aSaveThatFailsPartwayChangesNothingAtAll() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID survivor = rig.addActivity(owner, tripId, dayOne, "Must survive");
        long base = rig.planVersionOf(owner, tripId);

        rig.hold(owner, tripId, "session", null);
        savePlan(owner, tripId, base, """
                {"basePlanVersion": %d, "days": [
                  {"id": "%s", "title": "Renamed before the failure", "activities": [
                    {"fields": {"title": "Valid, and staged before the malformed one"}},
                    {"fields": {"title": "Malformed", "costAmount": "500", "costCurrency": ""}}
                  ]}
                ]}
                """.formatted(base, dayOne))
                .expectStatus()
                .is4xxClientError();

        String json = new String(rig.readTrip(owner, tripId));
        assertThat(json).as("no partial creation").doesNotContain("Valid, and staged before the malformed one");
        assertThat(json).as("no partial rename").doesNotContain("Renamed before the failure");
        assertThat(json).as("no partial deletion — the half-saved plan is what buffering exists to prevent")
                .contains("Must survive");
        assertThat(rig.planVersionOf(owner, tripId)).as("and the version never moved").isEqualTo(base);
        assertThat(survivor).isNotNull();
    }

    @Test
    void aPlanReferencingSomebodyElsesDayIsRefusedRatherThanAdopted() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String strangerToken = rig.travelerWithHandle("stranger" + suffix());
        String otherTrip = rig.createTrip(strangerToken, 1);
        UUID foreignDay = rig.dayAt(otherTrip, 1);
        long base = rig.planVersionOf(owner, tripId);

        rig.hold(owner, tripId, "session", null);
        savePlan(owner, tripId, base, planWithOneDayTitled(base, foreignDay, "Adopted from another trip"))
                .expectStatus()
                .isNotFound();

        assertThat(new String(rig.readTrip(strangerToken, otherTrip)))
                .as("the other trip's day is untouched")
                .doesNotContain("Adopted from another trip");
    }


    private RestTestClient.ResponseSpec savePlan(String token, String tripId, long base, String body) {
        assertThat(base).isNotNegative();
        return rig.send(HttpMethod.PUT, "/v1/itineraries/" + tripId + "/plan", token, body);
    }

    private static String planWithOneDayTitled(long base, UUID dayId, String title) {
        return """
                {"basePlanVersion": %d, "days": [{"id": "%s", "title": "%s", "activities": []}]}
                """.formatted(base, dayId, title);
    }

    private void publish(String token, String tripId) {
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/start", token, null).expectStatus().isOk();
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/complete", token, null).expectStatus().isOk();
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/publish", token, "{\"visibility\":\"public\"}")
                .expectStatus()
                .isOk();
    }

    private List<String> activityTitlesOf(UUID dayId) {
        return jdbc.queryForList(
                "SELECT title FROM activity WHERE day_id = ? ORDER BY sort_order", String.class, dayId);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
