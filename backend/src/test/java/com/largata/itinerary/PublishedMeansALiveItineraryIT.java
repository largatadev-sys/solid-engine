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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PublishedMeansALiveItineraryIT extends PostgresTestBase {

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
    void aTripCarryingOnlyTheOldFlagReadsAsUnpublishedAndItsPlanIsEditableAgain() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);

        flagPublishedWithoutAnItinerary(trip);

        assertThat(publishedFlagOf(trip)).isTrue();
        readTrip(owner, trip)
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.itineraryId")
                .doesNotExist();

        openTheEditingSession(owner, trip).expectStatus().isOk();
    }


    @Test
    void publishingFencesTheWorkspaceAndRetiringTheItineraryLiftsTheFence() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);

        String objectId = publish(owner, trip);
        readTrip(owner, trip)
                .jsonPath("$.published")
                .isEqualTo(true)
                .jsonPath("$.itineraryId")
                .isEqualTo(objectId);

        openTheEditingSession(owner, trip)
                .expectStatus()
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_PUBLISHED");

        unpublish(owner, trip);
        readTrip(owner, trip)
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.itineraryId")
                .doesNotExist();

        openTheEditingSession(owner, trip).expectStatus().isOk();
        closeTheEditingSession(owner, trip);
    }


    @Test
    void hardDeletingTheItineraryUnfreezesTheTrip() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);
        String objectId = publish(owner, trip);

        rest.delete()
                .uri("/v1/itineraries/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        readTrip(owner, trip).jsonPath("$.published").isEqualTo(false);
        openTheEditingSession(owner, trip).expectStatus().isOk();
    }


    @Test
    void republishingKeepsTheSameItineraryAndTheTripPointsAtIt() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);

        String first = publish(owner, trip);
        unpublish(owner, trip);
        String second = publish(owner, trip);

        assertThat(second).isEqualTo(first);
        readTrip(owner, trip).jsonPath("$.itineraryId").isEqualTo(first);
    }


    @Test
    void nothingWritesTheTripsPublishedColumnsAnyMore() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);

        publish(owner, trip);

        assertThat(publishedFlagOf(trip))
                .as(
                        "the flag columns are dead from CM-5 on - publishing must leave them exactly"
                                + " as they were, so nothing can quietly keep a second truth about"
                                + " what published means")
                .isFalse();
        assertThat(publishedAtOf(trip)).isNull();
    }


    @Test
    void unpublishingATripThatHasNoItineraryStillSucceeds() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        walkToCompleted(owner, trip);

        unpublish(owner, trip);
    }


    private void flagPublishedWithoutAnItinerary(String trip) {
        jdbc.update(
                "UPDATE itinerary SET published = TRUE, published_at = now() WHERE id = ?::uuid",
                trip);
    }


    private Boolean publishedFlagOf(String trip) {
        return jdbc.queryForObject(
                "SELECT published FROM itinerary WHERE id = ?::uuid", Boolean.class, trip);
    }


    private Object publishedAtOf(String trip) {
        return jdbc.queryForObject(
                "SELECT published_at FROM itinerary WHERE id = ?::uuid", Object.class, trip);
    }


    private RestTestClient.ResponseSpec openTheEditingSession(String token, String trip) {
        return rig.acquire(token, trip, "session", UUID.fromString(trip));
    }


    private void closeTheEditingSession(String token, String trip) {
        rig.releaseLease(token, trip, "session", UUID.fromString(trip)).expectStatus().isNoContent();
    }


    private RestTestClient.BodyContentSpec readTrip(String token, String trip) {
        return rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
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
