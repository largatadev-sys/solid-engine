package com.largata.itinerary;

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
class ItineraryPageIT extends PostgresTestBase {

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
    void theItineraryReadAnswersTheWholePageAndKeepsTheRawPlanBesideIt() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Snorkel the lagoon");
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        page(owner, objectId)
                .jsonPath("$.id")
                .isEqualTo(objectId)
                .jsonPath("$.tripId")
                .isEqualTo(trip)
                .jsonPath("$.title")
                .isEqualTo("Trip")
                .jsonPath("$.destination")
                .isEqualTo("Palawan")
                .jsonPath("$.durationDays")
                .isEqualTo(2)
                .jsonPath("$.creator.handle")
                .exists()
                .jsonPath("$.forkCount")
                .isEqualTo(0)
                .jsonPath("$.days.length()")
                .isEqualTo(2)
                .jsonPath("$.days[0].activities[0].title")
                .isEqualTo("Snorkel the lagoon")
                .jsonPath("$.days[0].activities[0].photos")
                .isArray()
                .jsonPath("$.plan.title")
                .isEqualTo("Trip");
    }


    @Test
    void aStrangerReadsAPrivateOwnersItinerary_becauseAPublishedItineraryIsPublic() {
        String owner = rig.travelerWithHandle(handle());
        String stranger = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        goPrivate(owner);

        page(stranger, objectId).jsonPath("$.id").isEqualTo(objectId);
    }


    @Test
    void archivingHidesThePageFromEveryoneButTheOwnerAndUnarchivingBringsItBack() {
        String owner = rig.travelerWithHandle(handle());
        String stranger = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        archive(owner, trip);

        readRaw(stranger, objectId).expectStatus().isNotFound();
        page(owner, objectId).jsonPath("$.id").isEqualTo(objectId);

        unarchive(owner, trip);
        page(stranger, objectId).jsonPath("$.id").isEqualTo(objectId);
    }


    @Test
    void theByTripReadAnswersTheLiveItineraryAndNotFoundWhenThereIsNone() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);

        byTripRaw(owner, trip).expectStatus().isNotFound();

        String objectId = publish(owner, trip);
        byTripRaw(owner, trip)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(objectId)
                .jsonPath("$.tripId")
                .isEqualTo(trip);
    }


    @Test
    void republishingKeepsTheIdAndRefreshesTheSnapshotAndTheDiscoverColumns() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        assertThat(titleOf(objectId)).isEqualTo("Trip");
        assertThat(destinationOf(objectId)).isEqualTo("Palawan");
        assertThat(durationOf(objectId)).isEqualTo(1);

        unpublish(owner, trip);
        rig.hold(owner, trip, "header", UUID.fromString(trip));
        rest.patch()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Renamed before republishing\",\"destination\":\"Siargao\"}")
                .exchange()
                .expectStatus()
                .isOk();
        rig.releaseLease(owner, trip, "header", UUID.fromString(trip)).expectStatus().isNoContent();

        String again = publish(owner, trip);

        assertThat(again).isEqualTo(objectId);
        assertThat(titleOf(objectId)).isEqualTo("Renamed before republishing");
        assertThat(destinationOf(objectId)).isEqualTo("Siargao");
        page(owner, objectId).jsonPath("$.title").isEqualTo("Renamed before republishing");
    }


    @Test
    void theDiscoverColumnsAreWrittenAtMintSoAFilterCanReadThem() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 3);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        assertThat(titleOf(objectId)).isNotNull();
        assertThat(destinationOf(objectId)).isNotNull();
        assertThat(durationOf(objectId)).isEqualTo(3);
    }


    private String titleOf(String objectId) {
        return jdbc.queryForObject(
                "SELECT title FROM itinerary_object WHERE id = ?::uuid", String.class, objectId);
    }


    private String destinationOf(String objectId) {
        return jdbc.queryForObject(
                "SELECT destination FROM itinerary_object WHERE id = ?::uuid", String.class, objectId);
    }


    private Integer durationOf(String objectId) {
        return jdbc.queryForObject(
                "SELECT duration_days FROM itinerary_object WHERE id = ?::uuid", Integer.class, objectId);
    }


    private RestTestClient.BodyContentSpec page(String token, String objectId) {
        return readRaw(token, objectId).expectStatus().isOk().expectBody();
    }


    private RestTestClient.ResponseSpec readRaw(String token, String objectId) {
        return rest.get()
                .uri("/v1/itineraries/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange();
    }


    private RestTestClient.ResponseSpec byTripRaw(String token, String trip) {
        return rest.get()
                .uri("/v1/trips/" + trip + "/itinerary")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange();
    }


    private String publish(String owner, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/trips/" + trip + "/publish")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private void unpublish(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void archive(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void unarchive(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/unarchive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void goPrivate(String token) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"private\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void walkToCompleted(String owner, String trip) {
        for (String act : new String[] {"start", "complete"}) {
            rest.post()
                    .uri("/v1/trips/" + trip + "/" + act)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
