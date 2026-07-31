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
class PlanCollaborationIT extends PostgresTestBase {

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
    void twoMembersEditDifferentActivitiesOfOneDayAndBothSavesLand() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID hers = rig.addActivity(owner, tripId, dayOne, "Sunset cruise");
        UUID his = rig.addActivity(member, tripId, dayOne, "Dive shop");

        rig.hold(owner, tripId, "activity", hers);
        rig.hold(member, tripId, "activity", his);

        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + hers,
                        owner,
                        "{\"title\":\"Sunset cruise, 6pm\"}")
                .expectStatus()
                .isOk();
        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(tripId, dayOne) + "/" + his,
                        member,
                        "{\"title\":\"Dive shop, booked\"}")
                .expectStatus()
                .isOk();

        assertThat(titlesOf(dayOne)).containsExactly("Sunset cruise, 6pm", "Dive shop, booked");
    }

    @Test
    void aMemberCannotAddOrRemoveDaysButTheOwnerCan() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        String member = rig.joinAsMember(owner, tripId, "member" + suffix());
        UUID dayTwo = rig.dayAt(tripId, 2);

        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", member, "{}")
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        rig.hold(member, tripId, "day", dayTwo);
        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayTwo, member, null)
                .expectStatus()
                .isForbidden();
        rig.releaseLease(member, tripId, "day", dayTwo).expectStatus().isNoContent();

        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/days", owner, "{}")
                .expectStatus()
                .isCreated();
        rig.hold(owner, tripId, "day", dayTwo);
        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayTwo, owner, null)
                .expectStatus()
                .isNoContent();
    }

    @Test
    void aDayCannotBeYankedOutFromUnderAMemberEditingAnActivityInsideIt() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 2);
        String editorHandle = "editor" + suffix();
        String editor = rig.joinAsMember(owner, tripId, editorHandle);
        UUID dayTwo = rig.dayAt(tripId, 2);
        UUID inside = rig.addActivity(editor, tripId, dayTwo, "Mid-edit");

        rig.hold(editor, tripId, "activity", inside);
        rig.hold(owner, tripId, "day", dayTwo);

        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayTwo, owner, null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DAY_HAS_LEASED_ACTIVITY")
                .jsonPath("$.message")
                .value(message -> assertThat((String) message).contains("@" + editorHandle));

        rig.releaseLease(editor, tripId, "activity", inside).expectStatus().isNoContent();
        rig.send(HttpMethod.DELETE, "/v1/itineraries/" + tripId + "/days/" + dayTwo, owner, null)
                .expectStatus()
                .isNoContent();
    }

    @Test
    void theReadPayloadCarriesEachSubjectsHolderAndTheLastEditorsHandle() {
        String ownerHandle = "owner" + suffix();
        String owner = rig.travelerWithHandle(ownerHandle);
        String tripId = rig.createTrip(owner, 1);
        String holderHandle = "holder" + suffix();
        String holder = rig.joinAsMember(owner, tripId, holderHandle);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayOne, "Planned by the owner");

        rig.hold(holder, tripId, "activity", activityId);
        rig.hold(holder, tripId, "day", dayOne);

        rig.send(HttpMethod.GET, "/v1/itineraries/" + tripId, owner, null)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].lease.handle")
                .isEqualTo(holderHandle)
                .jsonPath("$.days[0].activities[0].lease.handle")
                .isEqualTo(holderHandle)
                .jsonPath("$.days[0].activities[0].lastEditedByHandle")
                .isEqualTo(ownerHandle)
                .jsonPath("$.lease")
                .doesNotExist()
                .jsonPath("$.workspaceState")
                .isEqualTo("active");
    }

    @Test
    void anExpiredHoldIsAbsentFromTheReadPayloadSoTheIndicatorSelfHeals() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);

        rig.hold(owner, tripId, "day", dayOne);
        rig.releaseLease(owner, tripId, "day", dayOne).expectStatus().isNoContent();

        rig.send(HttpMethod.GET, "/v1/itineraries/" + tripId, owner, null)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].lease")
                .doesNotExist();
    }

    @Test
    void aReorderBuiltOnAStaleOrderingIsRefusedOverHttp() {
        String owner = rig.travelerWithHandle("owner" + suffix());
        String tripId = rig.createTrip(owner, 1);
        UUID dayOne = rig.dayAt(tripId, 1);
        UUID first = rig.addActivity(owner, tripId, dayOne, "First");
        UUID second = rig.addActivity(owner, tripId, dayOne, "Second");
        String asFetched = "[\"" + first + "\",\"" + second + "\"]";
        String swapped = "[\"" + second + "\",\"" + first + "\"]";

        rig.send(
                        HttpMethod.PUT,
                        TripRig.activitiesUri(tripId, dayOne) + "/order",
                        owner,
                        "{\"expectedActivityIds\":" + asFetched + ",\"activityIds\":" + swapped + "}")
                .expectStatus()
                .isOk();

        rig.send(
                        HttpMethod.PUT,
                        TripRig.activitiesUri(tripId, dayOne) + "/order",
                        owner,
                        "{\"expectedActivityIds\":" + asFetched + ",\"activityIds\":" + asFetched + "}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("STALE_REORDER");

        assertThat(titlesOf(dayOne)).containsExactly("Second", "First");
    }


    private java.util.List<String> titlesOf(UUID dayId) {
        return jdbc.queryForList(
                "SELECT title FROM activity WHERE day_id = ? ORDER BY sort_order, id", String.class, dayId);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
