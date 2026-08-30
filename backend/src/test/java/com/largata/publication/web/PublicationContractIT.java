package com.largata.publication.web;

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
class PublicationContractIT extends PostgresTestBase {

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
    void publishingMintsTheObjectFromTheFrozenPlanAndTheOldWorldSeesThePublish() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Snorkel the lagoon");
        walkToCompleted(owner, trip);

        String objectId =
                TripRig.fieldIn(
                        rest.post()
                                .uri("/v1/trips/" + trip + "/publish")
                                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body("{\"audience\":\"public\"}")
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .jsonPath("$.tripId")
                                .isEqualTo(trip)
                                .jsonPath("$.audience")
                                .isEqualTo("public")
                                .jsonPath("$.plan.title")
                                .isEqualTo("Trip")
                                .jsonPath("$.plan.destination")
                                .isEqualTo("Palawan")
                                .jsonPath("$.plan.days.length()")
                                .isEqualTo(2)
                                .jsonPath("$.plan.days[0].activities[0].title")
                                .isEqualTo("Snorkel the lagoon")
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        assertThat(objectId).isNotEqualTo(trip);
        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.published")
                .isEqualTo(true)
                .jsonPath("$.visibility")
                .isEqualTo("public");
    }


    @Test
    void anySignedInTravelerReadsTheMintedObject() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri("/v1/publications/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.plan.title")
                .isEqualTo("Trip")
                .jsonPath("$.plan.days.length()")
                .isEqualTo(1);
    }


    @Test
    void unpublishRetiresButTheIdentitySurvivesTheCycle() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String mintedId = publish(owner, trip);

        rest.post()
                .uri("/v1/trips/" + trip + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/publications/" + mintedId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PUBLICATION_NOT_FOUND");
        rest.get()
                .uri("/v1/itineraries/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.published")
                .isEqualTo(false);

        rig.editHeader(
                owner, trip, "{\"title\":\"Renamed after the cycle\",\"destination\":\"Palawan\"}");
        String republishedId = publish(owner, trip);

        assertThat(republishedId).as("the id never changes across publish cycles").isEqualTo(mintedId);
        rest.get()
                .uri("/v1/publications/" + mintedId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.plan.title")
                .isEqualTo("Renamed after the cycle");
    }


    @Test
    void aMemberIsForbiddenByNameAndAStrangerIsMasked() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, handle());
        String stranger = rig.travelerWithHandle(handle());
        walkToCompleted(owner, trip);

        rest.post()
                .uri("/v1/trips/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        rest.post()
                .uri("/v1/trips/" + trip + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden();
        rest.post()
                .uri("/v1/trips/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");
    }


    @Test
    void anUncompletedTripRefusesToPublishByName() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);

        rest.post()
                .uri("/v1/trips/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_COMPLETE");
    }


    @Test
    void anUnknownAudienceIsRefusedByName() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);

        rest.post()
                .uri("/v1/trips/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"everyone\"}")
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNKNOWN_AUDIENCE");
    }


    @Test
    void hardDeleteByTheRecordedOwnerDestroysTheObjectEvenWhenTheTripIsGone() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/publications/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PUBLICATION_NOT_FOUND");

        jdbc.update("DELETE FROM itinerary WHERE id = ?", UUID.fromString(trip));

        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/publications/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM itinerary_object WHERE id = ?",
                                Integer.class,
                                UUID.fromString(objectId)))
                .isZero();
        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/publications/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    private String publish(String owner, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/trips/" + trip + "/publish")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"audience\":\"public\"}")
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private void walkToCompleted(String owner, String trip) {
        for (String act : new String[] {"start", "complete"}) {
            rest.post()
                    .uri("/v1/itineraries/" + trip + "/" + act)
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
